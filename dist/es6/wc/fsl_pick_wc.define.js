import { FslPick } from './fsl_pick_wc.js';
if (!customElements.get('fsl-pick')) {
    customElements.define('fsl-pick', FslPick);
}
if (!customElements.get('jssm-pick')) {
    customElements.define('jssm-pick', class extends FslPick {
    });
}
