declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
  const _default: {
    toDataURL: typeof toDataURL;
  };
  export default _default;
}
