/*
 * @Author: wuqinfa
 * @Date: 2022-05-24 11:07:32
 * @LastEditTime: 2022-05-24 18:19:39
 * @LastEditors: wuqinfa
 * @Description: 定义编辑区域角色以及角色对应的权限值
 */
'use strict';

goog.provide('Blockly.Role');

goog.require('Blockly.Authority');

Blockly.Role = function(role = 'student') {
  var studentAuth = [];
  var teacherAuth = [Blockly.Authority.lock, Blockly.Authority.invisible]; // 默认内置 'teacher' 这种角色的权限

  this.role_ = role;
  this.roleAuth_ = [];

  this.setRoleAuth(role === 'teacher' ? teacherAuth : studentAuth);
};

Blockly.Role.prototype.setRoleAuth = function(auth) {
  this.roleAuth_ = [...auth];
}

Blockly.Role.prototype.getRoleAuth = function() {
  return this.roleAuth_;
}

/**
 * 验证当前角色是否存在目标权限
 * @param {String} targetAuth Blockly.Authority 中定义的权限
 * @returns {boolean} true：有权限；false：无权限
 */
Blockly.Role.prototype.verifyAuth = function(targetAuth) {
  return this.roleAuth_.includes(targetAuth);
}

