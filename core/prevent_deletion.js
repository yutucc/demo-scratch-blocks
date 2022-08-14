/*
 * @Author: wuqinfa
 * @Date: 2022-08-13 10:36:36
 * @LastEditTime: 2022-08-13 21:41:10
 * @LastEditors: wuqinfa
 * @Description: 禁止删除的标识
 *    ps：仿照 core/comment.js、抄 2.0  mxc-blocks-pc 中的 core/deletable.js
 */
'use strict';

goog.provide('Blockly.PreventDeletion');

goog.require('Blockly.Icon');

Blockly.PreventDeletion = function(block) {
  Blockly.PreventDeletion.superClass_.constructor.call(this, block);
  this.createIcon();
};
goog.inherits(Blockly.PreventDeletion, Blockly.Icon);


Blockly.PreventDeletion.prototype.text_ = '';

Blockly.PreventDeletion.prototype.width_ = 160;

Blockly.PreventDeletion.prototype.height_ = 80;


Blockly.PreventDeletion.prototype.drawIcon_ = function(group) {
  // Circle.
  Blockly.utils.createSvgElement(
    'circle',
    { r: '8', cx: '8', cy: '8', fill: '#f00', stroke: '#fff' },
    group
  );

  var icon = Blockly.utils.createSvgElement(
    'image',
    {
      width: 12,
      height: 12,
      x: 2,
      y: 2,
    },
    group
  );

  icon.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    Blockly.mainWorkspace.options.pathToMedia + 'prevent-deletion.svg'
  );
};

Blockly.PreventDeletion.prototype.setVisible = function() {};

Blockly.PreventDeletion.prototype.dispose = function() {
  this.block_.preventDeletion = null;
  Blockly.Icon.prototype.dispose.call(this);
};
