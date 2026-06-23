import { FslPick } from './pick.js';

if (!customElements.get('fsl-pick')) {
    customElements.define('fsl-pick', FslPick);
}
if (!customElements.get('jssm-pick')) {
    customElements.define('jssm-pick', class extends FslPick {
    });
}
