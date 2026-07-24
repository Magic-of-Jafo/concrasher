import { canonicalizeEmail, sameInbox } from './email-normalize';

describe('canonicalizeEmail', () => {
    it('strips Gmail dots and +tags, folds googlemail', () => {
        expect(canonicalizeEmail('jo.sep.hl.i.ng.u.a@gmail.com')).toBe('josephlingua@gmail.com');
        expect(canonicalizeEmail('josephlingua@gmail.com')).toBe('josephlingua@gmail.com');
        expect(canonicalizeEmail('joseph.lingua+spam@gmail.com')).toBe('josephlingua@gmail.com');
        expect(canonicalizeEmail('JosephLingua@GoogleMail.com')).toBe('josephlingua@gmail.com');
    });

    it('all the dotted spam variants collapse to one inbox', () => {
        const variants = [
            'fi.rat.c.ic.e.k7.5.09@gmail.com',
            'firat.cicek7509@gmail.com',
            'f.i.r.a.t.c.i.c.e.k.7.5.0.9@gmail.com',
            'firatcicek7509+conventioncrasher@gmail.com',
        ];
        const canon = variants.map(canonicalizeEmail);
        expect(new Set(canon).size).toBe(1);
        expect(canon[0]).toBe('firatcicek7509@gmail.com');
    });

    it('keeps dots for non-Gmail providers (dots are significant there)', () => {
        expect(canonicalizeEmail('john.smith@outlook.com')).toBe('john.smith@outlook.com');
        expect(canonicalizeEmail('a.b.c@defnet.com')).toBe('a.b.c@defnet.com');
    });

    it('strips +tags everywhere, not just Gmail', () => {
        expect(canonicalizeEmail('user+news@fastmail.com')).toBe('user@fastmail.com');
        expect(canonicalizeEmail('user+a@outlook.com')).toBe('user@outlook.com');
    });

    it('lowercases and trims', () => {
        expect(canonicalizeEmail('  User@Example.COM ')).toBe('user@example.com');
    });

    it('returns a stable value for unparseable input', () => {
        expect(canonicalizeEmail('not-an-email')).toBe('not-an-email');
        expect(canonicalizeEmail('')).toBe('');
        expect(canonicalizeEmail('@nope.com')).toBe('@nope.com');
    });

    it('sameInbox compares canonically', () => {
        expect(sameInbox('J.O.E+x@gmail.com', 'joe@googlemail.com')).toBe(true);
        expect(sameInbox('john.smith@outlook.com', 'johnsmith@outlook.com')).toBe(false);
    });
});
