export type ImageSourceType = "url" | "local";

type BaseImageSource = {
    /**
     * The human-readable identifier for the image source.
     */
    identifier: string;

    /**
     * The type of the image source.
     */
    type: ImageSourceType;
};

export type UrlImageSource = BaseImageSource & {
    type: "url";
    url: string;
};

export type LocalImageSource = BaseImageSource & {
    type: "local";
    path: string;
};

export type ImageSource = UrlImageSource | LocalImageSource;