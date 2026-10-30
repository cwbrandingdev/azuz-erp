import { extractValidCnpjs, isValidCnpj } from './cnpj.util';

describe('cnpj util', () => {
  it('accepts a CNPJ with valid check digits', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('rejects a CNPJ with a bad check digit', () => {
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
  });

  it('prefers a labeled CNPJ and ignores numbers inside scripts', () => {
    const html = `
      <script>var id = "11.222.333/0001-81";</script>
      <footer>CNPJ 34.028.316/0001-03</footer>
      <p>11.444.777/0001-61</p>
    `;
    expect(extractValidCnpjs(html)).toEqual([
      '34028316000103',
      '11444777000161',
    ]);
  });
});
