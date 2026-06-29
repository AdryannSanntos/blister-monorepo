import { dedupeCarouselSlidesById } from './carousel-output.util';

describe('dedupeCarouselSlidesById', () => {
  it('removes duplicate ids keeping the lowest order', () => {
    const result = dedupeCarouselSlidesById([
      { id: 'slide_1', order: 2, htmlContent: 'b' },
      { id: 'slide_1', order: 1, htmlContent: 'a' },
      { id: 'slide_2', order: 2, htmlContent: 'c' },
    ]);

    expect(result).toEqual([
      { id: 'slide_1', order: 1, htmlContent: 'a' },
      { id: 'slide_2', order: 2, htmlContent: 'c' },
    ]);
  });
});
