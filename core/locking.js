/*
 * @Author: wuqinfa
 * @Date: 2022-05-23 16:30:24
 * @LastEditTime: 2022-05-23 16:54:48
 * @LastEditors: wuqinfa
 * @Description: 完全锁定的标识
 *    ps：仿照 core/comment.js、抄 2.0  mxc-blocks-pc 中的 core/locking.js
 */
'use strict';

goog.provide('Blockly.Locking');

goog.require('Blockly.Icon');


Blockly.Locking = function(block) {
    Blockly.Locking.superClass_.constructor.call(this, block);
    this.createIcon();
};
goog.inherits(Blockly.Locking, Blockly.Icon);


Blockly.Locking.prototype.text_ = '';


Blockly.Locking.prototype.width_ = 160;


Blockly.Locking.prototype.height_ = 80;


Blockly.Locking.prototype.drawIcon_ = function(group) {
    // Circle.
    Blockly.utils.createSvgElement(
        'circle',
        { r: '8', cx: '8', cy: '8', fill: '#f00', stroke: '#fff' },
        group
    );
    // Can't use a real '?' text character since different browsers and operating
    // systems render it differently.
    // Body of question mark.
    Blockly.utils.createSvgElement(
        'circle',
        { r: '3', cx: '8', cy: '6', fill: 'none', stroke: '#fff' },
        group
    );
    // Dot of question mark.
    Blockly.utils.createSvgElement(
        'rect',
        {
            class: 'blocklyIconSymbol',
            x: '4',
            y: '7',
            height: '5',
            width: '8',
        },
        group
    );
};

Blockly.Locking.prototype.setVisible = function() {};


/**
 * Dispose of this Locking.
 */
Blockly.Locking.prototype.dispose = function() {
    this.block_.locking = null;
    Blockly.Icon.prototype.dispose.call(this);
};
