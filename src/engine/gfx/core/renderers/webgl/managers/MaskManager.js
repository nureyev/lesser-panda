import WebGLManager from './WebGLManager';
import AlphaMaskFilter from '../filters/SpriteMaskFilter';

/**
 * @class
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
export default function MaskManager(renderer) {
  WebGLManager.call(this, renderer);

  this.stencilStack = [];
  this.reverse = true;
  this.count = 0;

  this.alphaMaskPool = [];
}

MaskManager.prototype = Object.create(WebGLManager.prototype);
MaskManager.prototype.constructor = MaskManager;

/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param graphics {Graphics}
 * @param webGLData {any[]}
 */
MaskManager.prototype.pushMask = function(target, maskData) {
  if (maskData.texture) {
    this.pushSpriteMask(target, maskData);
  }
  else {
    this.pushStencilMask(target, maskData);
  }

};

/**
 * Removes the last mask from the mask stack and doesn't return it.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.popMask = function(target, maskData) {
  if (maskData.texture) {
    this.popSpriteMask(target, maskData);
  }
  else {
    this.popStencilMask(target, maskData);
  }
};

/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.pushSpriteMask = function(target, maskData) {
  var alphaMaskFilter = this.alphaMaskPool.pop();

  if (!alphaMaskFilter) {
    alphaMaskFilter = [new AlphaMaskFilter(maskData)];
  }

  alphaMaskFilter[0].maskSprite = maskData;
  this.renderer.filterManager.pushFilter(target, alphaMaskFilter);
};

/**
 * Removes the last filter from the filter stack and doesn't return it.
 *
 */
MaskManager.prototype.popSpriteMask = function() {
  var filters = this.renderer.filterManager.popFilter();

  this.alphaMaskPool.push(filters);
};


/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.pushStencilMask = function(target, maskData) {
  this.renderer.stencilManager.pushMask(maskData);
};

/**
 * Removes the last filter from the filter stack and doesn't return it.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.popStencilMask = function(target, maskData) {
  this.renderer.stencilManager.popMask(maskData);
};
