import SimpleEventEmitter from "@/utils/event-emitter";
import { makeRandomStorySecretKey, getBranchLink, makeViewKey } from "@/utils/utils";
import { StoryOptions } from "@/Story/types";
import {
  fetchAvatarAndTitleGivenViewKey,
  fetchAvatarAndTitleGivenStoryId
} from "@/utils/utils";
import { default as QRCode } from "qrcode";

export default abstract class AbstractStory {
  rootElement: HTMLElement;
  id: string;
  viewKey: string;
  timerId?: number;

  protected _elems: {
    title: HTMLElement;
    description: HTMLElement;
    avatar: HTMLElement;
    avatarContainer: HTMLElement;
  };

  protected _listenerRemoveFunctions: Array<() => void> = [];

  protected _eventEmitter = new SimpleEventEmitter();
  on = this._eventEmitter.on.bind(this._eventEmitter);
  off = this._eventEmitter.off.bind(this._eventEmitter);
  protected _title: string;
  protected _description: string;
  protected _avatarSrc: string = "";
  protected _color: string;

  get avatarSrc(): string {
    return this._avatarSrc;
  }
  set avatarSrc(src: string) {
    this._avatarSrc = src;
    this._elems.avatar.style.backgroundImage = `url(${src})`;
  }

  abstract get title(): string;
  abstract set title(title: string);
  abstract get description(): string;
  abstract set description(description: string);
  abstract get color(): string;
  abstract set color(color: string);

  protected abstract _createTemplate(): HTMLElement;

  protected checkForVideoInStory() {
    const promise = fetchAvatarAndTitleGivenViewKey(this.viewKey);
    promise.then((data) => {
      this.stopWatchingForVideoInStory();
      this.avatarSrc = data.src;
      this.title = data.title;
    }).catch((err) => {
    });
  }

  protected startWatchingForVideoInStory() {
    this.timerId = setInterval(() => this.checkForVideoInStory(), 5000);
  }

  protected stopWatchingForVideoInStory() {
    this.timerId && clearInterval(this.timerId);
  }

  protected constructor(options: StoryOptions) {
    this.rootElement = this._createTemplate();
    this._elems = {
      title: this._getElem("title"),
      description: this._getElem("description"),
      avatar: this._getElem("avatar"),
      avatarContainer: this._getElem("avatarContainer")
    };
    this.id = options.id || '';
    this.viewKey = options.viewKey || '';
    this._title = options.title || "";
    this.avatarSrc = options.avatarSrc || "";
    if (this.id || this.viewKey) {
      if (!options.avatarSrc || !this._title) {
        let promise;
        if (this.viewKey) {
          promise = fetchAvatarAndTitleGivenViewKey(this.viewKey);
        } else {
          promise = fetchAvatarAndTitleGivenStoryId(this.id);
        }
        promise.then(data => {
          this.avatarSrc = this.avatarSrc || data.src;
          this.title = this.title || data.title;
        });
      }
    } else {
      const secretKey = makeRandomStorySecretKey();
      console.log('webcruiter must save secretKey', secretKey);
      this.viewKey = makeViewKey(secretKey);
      console.log('viewKey is', this.viewKey);
      const storyName = secretKey.slice(0, 20);
      const data = {
        branch_key: "key_live_haoXB4nBJ0AHZj0o1OFOGjafzFa8nQOG",
        channel: 'sms',
        feature: 'sharing',
        data: {
          "~creation_source": 3,
          $ios_url: "https://itunes.apple.com/us/app/gobi-send-snaps-in-groups!/id1025344825?mt=8",
          $desktop_url: "http://www.gobiapp.com",
          $identity_id: "624199976595486526",
          //$desktop_url: 'https://gobistories.co/storyen/leggtilinnhold',
          // should be the image of the story, or an image of a gobi camera,
          // since this 'object' is to add video
          $og_image_url: 'https://gobiapp.com/img/gobi_blue.png',
          "$og_description": "Snaps in groups!",
          //$og_description: 'View, or Add a video to this story',
          $canonical_identifier: 'group/' + storyName,
          $og_title: 'Gobi',
          $one_time_use: false,
          $publicly_indexable: false,
          action: 'groupAdd', // recordVideo
          username: 'ovikholt', // maybe ios wants this? see AppDelegate.swift
          // TODO add another action to native/mobile clients
          group: storyName,
          // overloading meaning (originally it refers to id in inviteLink table in database)
          id: 'auto-' + secretKey,
          source: 'Gobi-Web-Integration webcruiter'
        }
      }
      const canvas = document.createElement('canvas');
      getBranchLink(data).then((result) => {
        const qrData = result.url;
        this.title = qrData;
        QRCode.toCanvas(canvas, qrData, (error) => {
          if (error) console.error(error);
          const dataUrl = canvas.toDataURL();
          this.avatarSrc = dataUrl;
          // User now scans this QR with their phone, and adds a video
          this.startWatchingForVideoInStory();
        });
      });
    }
    this._description = options.description || "";
    this._color = options.color || "";
    this._addSelectEmitter();
    if (typeof options.onSelect === "function") {
      this._eventEmitter.on("select", options.onSelect);
    }
    if (options.container) {
      options.container.appendChild(this.rootElement);
    }
  }

  destroy() {
    if (this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }
    this._eventEmitter.off();
    for (let i = this._listenerRemoveFunctions.length; i--; ) {
      this._listenerRemoveFunctions[i]();
    }
  }

  private _addSelectEmitter() {
    const selectAreas = this.rootElement.querySelectorAll(
      "[data-select-area]"
    ) as NodeListOf<HTMLElement>;
    const selectClickCallback = () => {
      this._eventEmitter.emit("select", this);
    };
    for (let i = selectAreas.length; i--; ) {
      selectAreas[i].addEventListener("click", selectClickCallback);
      this._listenerRemoveFunctions.push(() =>
        selectAreas[i].removeEventListener("click", selectClickCallback)
      );
    }
  }

  protected _getElem(name: string): HTMLElement {
    const attr = `data-${name}`;
    const elem = this.rootElement.querySelector(`[${attr}]`) as HTMLElement;
    if (elem) {
      elem.removeAttribute(attr);
      return elem;
    } else {
      throw new Error("Story does not contain element with name:" + name);
    }
  }
}
