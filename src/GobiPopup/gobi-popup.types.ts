import Player from "@/GobiPlayer/gobi-player";

export interface GobiPopupOptions {
    classes: string,
    openers: string,
    closers: string,
    player:Player
}
export interface GobiPopupComingOptions {
    classes?: string,
    openers?: string,
    closers?: string
    player:Player
}