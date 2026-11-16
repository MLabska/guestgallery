import { fitLongEdge } from '../src/lib/imageSize';

describe('fitLongEdge', () => {
  it('scales a landscape image', () => {
    expect(fitLongEdge(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });
  it('scales a portrait image', () => {
    expect(fitLongEdge(3000, 4000, 400)).toEqual({ width: 300, height: 400 });
  });
  it('does not upscale', () => {
    expect(fitLongEdge(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitLongEdge(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });
  it('never returns 0', () => {
    expect(fitLongEdge(10000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});
