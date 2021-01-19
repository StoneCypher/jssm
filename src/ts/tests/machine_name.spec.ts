
import { sm } from '../jssm';





describe('machine name', () => {

  test('doesn\'t throw', () =>
    expect( () => { const _foo = sm`machine_name: bob; a->b;`; }).not.toThrow()
  );

});
