/*
 * @Author: wuqinfa
 * @Date: 2022-05-23 16:30:24
 * @LastEditTime: 2022-06-02 15:41:52
 * @LastEditors: wuqinfa
 * @Description: 不可见的标识
 *    ps：仿照 core/comment.js
 */
'use strict';

goog.provide('Blockly.Invisible');

goog.require('Blockly.Icon');


Blockly.Invisible = function(block) {
  Blockly.Invisible.superClass_.constructor.call(this, block);
  this.createIcon();
};
goog.inherits(Blockly.Invisible, Blockly.Icon);


Blockly.Invisible.prototype.text_ = '';


Blockly.Invisible.prototype.width_ = 160;


Blockly.Invisible.prototype.height_ = 80;


Blockly.Invisible.prototype.drawIcon_ = function(group) {
  // Circle.
  Blockly.utils.createSvgElement(
      'circle',
      { r: '8', cx: '8', cy: '8', fill: '#f00', stroke: '#fff' },
      group
  );

  var icon = Blockly.utils.createSvgElement(
    'image',
    {
      width: 13,
      height: 13,
      x: 1.5,
      y: 1.5,
    },
    group
  );

  icon.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    Blockly.mainWorkspace.options.pathToMedia + 'invisible.svg'
  );
};

Blockly.Invisible.prototype.setVisible = function() {};


/**
 * Dispose of this Invisible.
 */
Blockly.Invisible.prototype.dispose = function() {
  this.block_.invisible = null;
  Blockly.Icon.prototype.dispose.call(this);
};
