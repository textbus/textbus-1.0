import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { AudioTemplate } from '../../templates/audio.template';
import { AudioCommander } from '../commands/audio.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const audioTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-music'],
  tooltip: '音频',
  menuFactory() {
    return new Form([{
      type: AttrType.TextField,
      label: '音频链接地址',
      name: 'src',
      required: true,
      placeholder: '请输入链接地址',
      canUpload: true,
      uploadType: 'audio',
      uploadBtnText: '上传新音频'
    }, {
      type: AttrType.Switch,
      label: '自动播放',
      required: true,
      checked: false,
      name: 'autoplay'
    }, {
      type: AttrType.Hidden,
      name: 'controls',
      value: 'controls'
    }]);
  },
  match: new MediaMatcher(AudioTemplate),
  execCommand() {
    return new AudioCommander();
  }
});