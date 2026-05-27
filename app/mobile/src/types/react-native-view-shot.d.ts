/**
 * Declaração local — o pacote react-native-view-shot não publica types
 * compatíveis com o tsconfig strict do projeto.
 */
declare module 'react-native-view-shot' {
  import { Component, ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    width?: number;
    height?: number;
    snapshotContentContainer?: boolean;
    fileName?: string;
  }

  export default class ViewShot extends Component<
    ViewProps & { options?: CaptureOptions; children?: ReactNode }
  > {
    capture?: () => Promise<string>;
  }
}
