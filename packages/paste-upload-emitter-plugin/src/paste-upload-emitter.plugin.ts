import { race } from 'rxjs';

import { Injectable, Input, TBPlugin, UIDialog, I18n, FileUploader } from '@textbus/core';
import { Form, FormTextField } from '@textbus/uikit';

@Injectable()
export class PasteUploadEmitterPlugin implements TBPlugin {
  constructor(private input: Input,
              private i18n: I18n,
              private fileUploader: FileUploader,
              private dialog: UIDialog) {
  }

  setup() {
    this.input.addPasteMiddleware(dom => {
      const images = Array.from(dom.querySelectorAll('img'));
      const videos = Array.from(dom.querySelectorAll('video'));
      const audios = Array.from(dom.querySelectorAll('audio'));

      const sourceElements = [...images, ...videos, ...audios];
      if (sourceElements.length === 0) {
        return dom;
      }
      return new Promise(resolve => {
        const form = new Form({
          title: this.i18n.get('plugins.pasteHandle.title'),
          maxHeight: '260px',
          confirmBtnText: this.i18n.get('plugins.pasteHandle.confirmBtnText'),
          cancelBtnText: this.i18n.get('plugins.pasteHandle.cancelBtnText'),
          items: [
            ...images.map((img, index) => {
              return new FormTextField({
                name: 'img' + index,
                value: img.src,
                label: this.i18n.joinTemplate(this.i18n.get('plugins.pasteHandle.imageLabel'), index + 1),
                placeholder: this.i18n.get('plugins.pasteHandle.imagePlaceholder'),
                uploadBtnText: this.i18n.get('plugins.pasteHandle.uploadBtnText'),
                uploadType: 'image',
                canUpload: true,
              })
            }),
            ...videos.map((video, index) => {
              return new FormTextField({
                name: 'video' + index,
                value: video.src,
                label: this.i18n.joinTemplate(this.i18n.get('plugins.pasteHandle.videoLabel'), index + 1),
                placeholder: this.i18n.get('plugins.pasteHandle.videoPlaceholder'),
                uploadBtnText: this.i18n.get('plugins.pasteHandle.uploadBtnText'),
                uploadType: 'video',
                canUpload: true,
              })
            }),
            ...audios.map((audio, index) => {
              return new FormTextField({
                name: 'audio' + index,
                value: audio.src,
                label: this.i18n.joinTemplate(this.i18n.get('plugins.pasteHandle.videoLabel'), index + 1),
                placeholder: this.i18n.get('plugins.pasteHandle.audioPlaceholder'),
                uploadBtnText: this.i18n.get('plugins.pasteHandle.uploadBtnText'),
                uploadType: 'audio',
                canUpload: true,
              })
            })
          ]
        })
        form.setFileUploader(this.fileUploader);
        this.dialog.dialog(form.elementRef);

        const sub = race(form.onClose, form.onComplete).subscribe(result => {
          sub.unsubscribe();
          if (result) {
            images.forEach((img, index) => {
              img.src = result.get('img' + index);
            })
            videos.forEach((video, index) => {
              video.src = result.get('video' + index);
            })
            audios.forEach((audio, index) => {
              audio.src = result.get('audio' + index);
            })
          }
          this.dialog.close();
          resolve(dom);
        })
      })
    })
  }
}
