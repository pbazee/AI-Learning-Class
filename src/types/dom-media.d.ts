import "react";

declare module "react" {
  interface AudioHTMLAttributes<T> {
    disableRemotePlayback?: boolean;
    controlsList?: string;
  }

  interface VideoHTMLAttributes<T> {
    disableRemotePlayback?: boolean;
    disablePictureInPicture?: boolean;
    controlsList?: string;
  }
}
