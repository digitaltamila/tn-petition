import {describe,expect,it} from 'vitest'; import {t} from './i18n';
describe('Tamil-first copy',()=>{it('provides Tamil and English calls to action',()=>{expect(t('ta','start')).toContain('மனு');expect(t('en','start')).toBe('Prepare petition')})});
