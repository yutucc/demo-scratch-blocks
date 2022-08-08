/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Toolbox from whence to create blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Toolbox');

goog.require('Blockly.Events.Ui');
goog.require('Blockly.HorizontalFlyout');
goog.require('Blockly.Touch');
goog.require('Blockly.VerticalFlyout');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.BrowserFeature');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.SafeStyle');
goog.require('goog.math.Rect');
goog.require('goog.style');
goog.require('goog.ui.tree.TreeControl');
goog.require('goog.ui.tree.TreeNode');


/**
 * Class for a Toolbox.
 * Creates the toolbox's DOM.
 * @param {!Blockly.Workspace} workspace The workspace in which to create new
 *     blocks.
 * @constructor
 */
Blockly.Toolbox = function(workspace) {
  /**
   * @type {!Blockly.Workspace}
   * @private
   */
  this.workspace_ = workspace;

  /**
   * Whether toolbox categories should be represented by icons instead of text.
   * @type {boolean}
   * @private
   */
  this.iconic_ = false;

  /**
   * Is RTL vs LTR.
   * @type {boolean}
   */
  this.RTL = workspace.options.RTL;

  /**
   * Whether the toolbox should be laid out horizontally.
   * @type {boolean}
   * @private
   */
  this.horizontalLayout_ = workspace.options.horizontalLayout;

  /**
   * Position of the toolbox and flyout relative to the workspace.
   * @type {number}
   */
  this.toolboxPosition = workspace.options.toolboxPosition;

  /**
   * 控制是否隐藏侧边积木选择区域（即：flyout）
   * @type {boolean} true：隐藏 flyout；false：显示 flyout
   * @private
   */
  this.isHideFlyout_ = false;

  /**
   * 显示、隐藏 flyout 的按钮
   * @type {goog.dom}
   * @private
   */
  this.triggerIcon_ = null;

  /**
   * 显示可删除区域的垃圾桶标识
   * @type {goog.dom}
   * @private
   */
  this.trash_ = null;
};

/**
 * Width of the toolbox, which changes only in vertical layout.
 * This is the sum of the width of the flyout (250) and the category menu (60).
 * @type {number}
 */
Blockly.Toolbox.prototype.width = 310;

/**
 * Height of the toolbox, which changes only in horizontal layout.
 * @type {number}
 */
Blockly.Toolbox.prototype.height = 0;

Blockly.Toolbox.prototype.selectedItem_ = null;

/**
 * Initializes the toolbox.
 */
Blockly.Toolbox.prototype.init = function() {
  var workspace = this.workspace_;
  var svg = this.workspace_.getParentSvg();

  /**
   * HTML container for the Toolbox menu.
   * @type {Element}
   */
  this.HtmlDiv =
      goog.dom.createDom(goog.dom.TagName.DIV, 'blocklyToolboxDiv');
  this.HtmlDiv.setAttribute('dir', workspace.RTL ? 'RTL' : 'LTR');
  svg.parentNode.insertBefore(this.HtmlDiv, svg);

  // Clicking on toolbox closes popups.
  Blockly.bindEventWithChecks_(this.HtmlDiv, 'mousedown', this,
      function(e) {
        // Cancel any gestures in progress.
        this.workspace_.cancelCurrentGesture();
        if (Blockly.utils.isRightButton(e) || e.target == this.HtmlDiv) {
          // Close flyout.
          Blockly.hideChaff(false);
        } else {
          // Just close popups.
          Blockly.hideChaff(true);
        }
        Blockly.Touch.clearTouchIdentifier();  // Don't block future drags.
      }, /*opt_noCaptureIdentifier*/ false, /*opt_noPreventDefault*/ true);

  this.createFlyout_();
  this.categoryMenu_ = new Blockly.Toolbox.CategoryMenu(this, this.HtmlDiv);
  this.populate_(workspace.options.languageTree);
  this.position();

  this.createTrigger(); // 创建隐藏 flyout 的按钮
  this.createMxcTrash(); // 创建可删除区域，显示垃圾桶的标志

  // 给 “显示、隐藏 flyout 的按钮” 添加点击事件
  // FIXME: 不知道为什么，这里如果换成绑定 mousedown 事件的话，在移动端会无法点击，也无法执行回调函数
  Blockly.bindEventWithChecks_(this.triggerIcon_, 'click', this, function() {
    if (this.isHideFlyout_) {
      // 当前 this.isHideFlyout_ 是 true，点击后会变成 false，即点击后 flyout 从隐藏状态变成显示状态
      this.scrollToCategoryById(this.getSelectedCategoryId()); // flyout 处于隐藏状态时切换角色，侧边栏会重置成选择第一种积木类型，所以要执行这个函数，将其滚动到对应位置
      this.showAll_(); // 展示 flyout

      this.foldTrigger() // 修改 this.triggerIcon_ 的图标和位置
    } else {
      this.flyout_.hide(); // 隐藏 flyout

      this.unfoldTrigger(); // 修改 this.triggerIcon_ 的图标和位置
    }

    this.triggerIsHideFlyout(); // 修改 this.isHideFlyout_ 的值

    /* 这一步有点取巧，目的是在修改this.isHideFlyout_ 的值的同时，
    调整当前积木可删除区域的计算位置，从而实现积木拖动到指定区域才能删除的效果
    这一步要结合下面 getClientRect 函数中的计算判断才有效果 */
    this.workspace_.resize();
  });
};

/**
 * 显示、隐藏 flyout 的按钮
 */
 Blockly.Toolbox.prototype.createTrigger = function() {
  var trigger = goog.dom.createDom(goog.dom.TagName.DIV, 'blocklyToolboxTrigger');
  var triggerIcon = goog.dom.createDom(goog.dom.TagName.IMG, 'blocklyToolboxTriggerIcon');

  triggerIcon.setAttribute('src', Blockly.mainWorkspace.options.pathToMedia + 'hide.svg');
  triggerIcon.style.right = '-337px';
  trigger.appendChild(triggerIcon);
  this.HtmlDiv.parentNode.insertBefore(trigger, this.HtmlDiv);

  this.triggerIcon_ = triggerIcon;
};

/**
 * 修改 this.triggerIcon_ 的图标和位置
 * https://res.miaocode.com/slim/Snipaste_2022-06-16_11-24-09-1655349874818.png
 */
Blockly.Toolbox.prototype.unfoldTrigger = function() {
  this.triggerIcon_.style.right = '-86px';
  this.triggerIcon_.setAttribute('src', Blockly.mainWorkspace.options.pathToMedia + 'show.svg');
};

/**
 * 修改 this.triggerIcon_ 的图标和位置
 * https://res.miaocode.com/slim/Snipaste_2022-06-16_11-24-21-1655349884215.png
 */
Blockly.Toolbox.prototype.foldTrigger = function() {
  this.triggerIcon_.style.right = '-337px';
  this.triggerIcon_.setAttribute('src', Blockly.mainWorkspace.options.pathToMedia + 'hide.svg');
};

/**
 * 获取当前 this.isHideFlyout_ 的值
 * @returns {boolean}
 */
Blockly.Toolbox.prototype.getIsHideFlyout = function() {
  return this.isHideFlyout_;
};

/**
 * 设置 this.isHideFlyout_ 的值
 */
Blockly.Toolbox.prototype.setIsHideFlyout = function(isHideFlyout_) {
  this.isHideFlyout_ = isHideFlyout_;
};

/**
 * 触发 this.isHideFlyout_ 的改变
 */
Blockly.Toolbox.prototype.triggerIsHideFlyout = function() {
  this.isHideFlyout_ = !this.isHideFlyout_;
};

/**
 * 创建一个垃圾桶（删除积木）显示标识
 */
 Blockly.Toolbox.prototype.createMxcTrash = function() {
  var trash = goog.dom.createDom(goog.dom.TagName.DIV, 'mxcTrash');

  this.HtmlDiv.parentNode.insertBefore(trash, this.HtmlDiv);
  this.trash_ = trash;
};

/**
 * 显示垃圾桶的图标
 */
Blockly.Toolbox.prototype.showMxcTrash = function() {
  this.trash_.style.display = 'block';
};

/**
 * 隐藏垃圾桶的图标
 */
Blockly.Toolbox.prototype.hideMxcTrash = function() {
  this.trash_.style.display = 'none';
};

/**
 * 拖动积木到可删除区域时，显示打开垃圾桶的图标
 */
Blockly.Toolbox.prototype.openMxcTrash = function() {
  Blockly.utils.addClass(/** @type {!Element} */ (this.trash_), 'mxcTrashOpen');
};

/**
 * 拖动积木到不可删除区域时，显示关闭垃圾桶的图标
 */
Blockly.Toolbox.prototype.closeMxcTrash = function() {
  Blockly.utils.removeClass(/** @type {!Element} */ (this.trash_), 'mxcTrashOpen');
};

/**
 * Dispose of this toolbox.
 */
Blockly.Toolbox.prototype.dispose = function() {
  this.flyout_.dispose();
  this.categoryMenu_.dispose();
  this.categoryMenu_ = null;
  goog.dom.removeNode(this.HtmlDiv);
  this.workspace_ = null;
  this.lastCategory_ = null;
};

/**
 * Create and configure a flyout based on the main workspace's options.
 * @private
 */
Blockly.Toolbox.prototype.createFlyout_ = function() {
  var workspace = this.workspace_;

  var options = {
    disabledPatternId: workspace.options.disabledPatternId,
    parentWorkspace: workspace,
    RTL: workspace.RTL,
    oneBasedIndex: workspace.options.oneBasedIndex,
    horizontalLayout: workspace.horizontalLayout,
    toolboxPosition: workspace.options.toolboxPosition,
    stackGlowFilterId: workspace.options.stackGlowFilterId
  };

  if (workspace.horizontalLayout) {
    this.flyout_ = new Blockly.HorizontalFlyout(options);
  } else {
    this.flyout_ = new Blockly.VerticalFlyout(options);
  }
  this.flyout_.setParentToolbox(this);

  goog.dom.insertSiblingAfter(
      this.flyout_.createDom('svg'), this.workspace_.getParentSvg());
  this.flyout_.init(workspace);
};

/**
 * Fill the toolbox with categories and blocks.
 * @param {!Node} newTree DOM tree of blocks.
 * @private
 */
Blockly.Toolbox.prototype.populate_ = function(newTree) {
  this.categoryMenu_.populate(newTree);
  this.showAll_();
  // this.setSelectedItem(this.categoryMenu_.categories_[0], false);

  // 原本这里调用的是 setSelectedItem 函数，因为 setSelectedItem 添加了点击 category 配合 this.isHideFlyout_ 的逻辑，所以额外再开一个函数
  this.setSelectedItemForPopulate(this.categoryMenu_.categories_[0], false); // 不设置默认值的话会有问题
};

/**
 * Show all blocks for all categories in the flyout
 * @private
 */
Blockly.Toolbox.prototype.showAll_ = function() {
  var allContents = [];
  for (var i = 0; i < this.categoryMenu_.categories_.length; i++) {
    var category = this.categoryMenu_.categories_[i];

    // create a label node to go at the top of the category
    var labelString = '<xml><label text="' + category.name_ + '"' +
      ' id="' + category.id_ + '"' +
      ' category-label="true"' +
      ' showStatusButton="' + category.showStatusButton_ + '"' +
      ' web-class="categoryLabel">' +
      '</label></xml>';
    var labelXML = Blockly.Xml.textToDom(labelString);

    allContents.push(labelXML.firstChild);

    allContents = allContents.concat(category.getContents());
  }
  this.flyout_.show(allContents);
};

/**
 * Get the width of the toolbox.
 * @return {number} The width of the toolbox.
 */
Blockly.Toolbox.prototype.getWidth = function() {
  return this.width;
};

/**
 * Get the height of the toolbox, not including the block menu.
 * @return {number} The height of the toolbox.
 */
Blockly.Toolbox.prototype.getHeight = function() {
  return this.categoryMenu_ ? this.categoryMenu_.getHeight() : 0;
};

/**
 * Move the toolbox to the edge.
 */
Blockly.Toolbox.prototype.position = function() {
  var treeDiv = this.HtmlDiv;
  if (!treeDiv) {
    // Not initialized yet.
    return;
  }
  var svg = this.workspace_.getParentSvg();
  var svgSize = Blockly.svgSize(svg);
  if (this.horizontalLayout_) {
    treeDiv.style.left = '0';
    treeDiv.style.height = 'auto';
    treeDiv.style.width = svgSize.width + 'px';
    this.height = treeDiv.offsetHeight;
    if (this.toolboxPosition == Blockly.TOOLBOX_AT_TOP) {  // Top
      treeDiv.style.top = '0';
    } else {  // Bottom
      treeDiv.style.bottom = '0';
    }
  } else {
    if (this.toolboxPosition == Blockly.TOOLBOX_AT_RIGHT) {  // Right
      treeDiv.style.right = '0';
    } else {  // Left
      treeDiv.style.left = '0';
    }
    treeDiv.style.height = '100%';
  }
  this.flyout_.position();
};

/**
 * Unhighlight any previously specified option.
 */
Blockly.Toolbox.prototype.clearSelection = function() {
  this.setSelectedItem(null);
};

/**
 * Adds a style on the toolbox. Usually used to change the cursor.
 * @param {string} style The name of the class to add.
 * @package
 */
Blockly.Toolbox.prototype.addStyle = function(style) {
  Blockly.utils.addClass(/** @type {!Element} */ (this.HtmlDiv), style);
};

/**
 * Removes a style from the toolbox. Usually used to change the cursor.
 * @param {string} style The name of the class to remove.
 * @package
 */
Blockly.Toolbox.prototype.removeStyle = function(style) {
  Blockly.utils.removeClass(/** @type {!Element} */ (this.HtmlDiv), style);
};

/**
 * Return the deletion rectangle for this toolbox.
 * @return {goog.math.Rect} Rectangle in which to delete.
 */
Blockly.Toolbox.prototype.getClientRect = function() {
  if (!this.HtmlDiv) {
    return null;
  }

  // If not an auto closing flyout, always use the (larger) flyout client rect
  /* 这一步跟 core/workspace_svg.js 中的 recordDeleteAreas_ 函数有关
  目的是为了计算出当前积木可删除区域的位置
  结合 this.isHideFlyout_ 的变化，实现下图交互：
      https://tva1.sinaimg.cn/large/b3cc33a0gy1h4y7yumu1tj20ye16kk62.jpg
      https://tva1.sinaimg.cn/large/b3cc33a0gy1h4y7z7018ij20vc15w7dd.jpg */
  if (!this.flyout_.autoClose && !this.isHideFlyout_) {
    return this.flyout_.getClientRect();
  }

  // BIG_NUM is offscreen padding so that blocks dragged beyond the toolbox
  // area are still deleted.  Must be smaller than Infinity, but larger than
  // the largest screen size.
  var BIG_NUM = 10000000;
  var toolboxRect = this.HtmlDiv.getBoundingClientRect();

  var x = toolboxRect.left;
  var y = toolboxRect.top;
  var width = toolboxRect.width;
  var height = toolboxRect.height;

  // Assumes that the toolbox is on the SVG edge.  If this changes
  // (e.g. toolboxes in mutators) then this code will need to be more complex.
  if (this.toolboxPosition == Blockly.TOOLBOX_AT_LEFT) {
    return new goog.math.Rect(-BIG_NUM, -BIG_NUM, BIG_NUM + x + width,
        2 * BIG_NUM);
  } else if (this.toolboxPosition == Blockly.TOOLBOX_AT_RIGHT) {
    return new goog.math.Rect(toolboxRect.right - width, -BIG_NUM, BIG_NUM + width, 2 * BIG_NUM);
  } else if (this.toolboxPosition == Blockly.TOOLBOX_AT_TOP) {
    return new goog.math.Rect(-BIG_NUM, -BIG_NUM, 2 * BIG_NUM,
        BIG_NUM + y + height);
  } else {  // Bottom
    return new goog.math.Rect(0, y, 2 * BIG_NUM, BIG_NUM);
  }
};

/**
 * Update the flyout's contents without closing it.  Should be used in response
 * to a change in one of the dynamic categories, such as variables or
 * procedures.
 */
Blockly.Toolbox.prototype.refreshSelection = function() {
  this.showAll_();
};

/**
 * @return {Blockly.Toolbox.Category} the currently selected category.
 */
Blockly.Toolbox.prototype.getSelectedItem = function() {
  return this.selectedItem_;
};

/**
 * @return {string} The name of the currently selected category.
 */
Blockly.Toolbox.prototype.getSelectedCategoryName = function() {
  return this.selectedItem_.name_;
};

/**
 * @return {string} The id of the currently selected category.
 * @public
 */
Blockly.Toolbox.prototype.getSelectedCategoryId = function() {
  return this.selectedItem_.id_;
};

/**
 * @return {number} The distance flyout is scrolled below the top of the currently
 * selected category.
 */
Blockly.Toolbox.prototype.getCategoryScrollOffset = function() {
  var categoryPos = this.getCategoryPositionById(this.getSelectedCategoryId());
  return this.flyout_.getScrollPos() - categoryPos;
};

/**
 * Get the position of a category by name.
 * @param  {string} name The name of the category.
 * @return {number} The position of the category.
 */
Blockly.Toolbox.prototype.getCategoryPositionByName = function(name) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (name === scrollPositions[i].categoryName) {
      return scrollPositions[i].position;
    }
  }
};

/**
 * Get the position of a category by id.
 * @param  {string} id The id of the category.
 * @return {number} The position of the category.
 * @public
 */
Blockly.Toolbox.prototype.getCategoryPositionById = function(id) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (id === scrollPositions[i].categoryId) {
      return scrollPositions[i].position;
    }
  }
};

/**
 * Get the length of a category by name.
 * @param  {string} name The name of the category.
 * @return {number} The length of the category.
 */
Blockly.Toolbox.prototype.getCategoryLengthByName = function(name) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (name === scrollPositions[i].categoryName) {
      return scrollPositions[i].length;
    }
  }
};

/**
 * Get the length of a category by id.
 * @param  {string} id The id of the category.
 * @return {number} The length of the category.
 * @public
 */
Blockly.Toolbox.prototype.getCategoryLengthById = function(id) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (id === scrollPositions[i].categoryId) {
      return scrollPositions[i].length;
    }
  }
};

/**
 * Set the scroll position of the flyout.
 * @param {number} pos The position to set.
 */
Blockly.Toolbox.prototype.setFlyoutScrollPos = function(pos) {
  this.flyout_.setScrollPos(pos);
};


/**
 * Set the currently selected category.
 * @param {Blockly.Toolbox.Category} item The category to select.
 * @param {boolean=} opt_shouldScroll Whether to scroll to the selected category. Defaults to true.
 */
Blockly.Toolbox.prototype.setSelectedItem = function(item, opt_shouldScroll) {
  if (typeof opt_shouldScroll === 'undefined') {
    opt_shouldScroll = true;
  }
  if (this.selectedItem_) {
    // They selected a different category but one was already open.  Close it.
    this.selectedItem_.setSelected(false);
  }
  this.selectedItem_ = item;
  if (this.selectedItem_ != null) {
    this.selectedItem_.setSelected(true);
    // Scroll flyout to the top of the selected category
    var categoryId = item.id_;
    if (opt_shouldScroll) {
      this.scrollToCategoryById(categoryId);
    }

    // 在点击 category 时，如果 flyout 处于隐藏状态，则需要修改为显示状态
    // 原本 setSelectedItem 函数没有这个 if 中的逻辑，是自己新加的
    if (this.isHideFlyout_) {
      this.showAll_();

      this.foldTrigger();

      this.setIsHideFlyout(false);
      this.workspace_.resize();
    }
  }
};

/**
 * copy 原本 setSelectedItem 的逻辑，并加了一个 this.isHideFlyout_ 逻辑
 */
 Blockly.Toolbox.prototype.setSelectedItemForPopulate = function(item, opt_shouldScroll) {
  if (typeof opt_shouldScroll === 'undefined') {
    opt_shouldScroll = true;
  }
  if (this.selectedItem_) {
    // They selected a different category but one was already open.  Close it.
    this.selectedItem_.setSelected(false);
  }
  this.selectedItem_ = item;
  if (this.selectedItem_ != null) {
    this.selectedItem_.setSelected(true);

    // Scroll flyout to the top of the selected category
    var categoryId = item.id_;
    if (opt_shouldScroll) {
      this.scrollToCategoryById(categoryId);
    }
  }

  /* 这里又有点取巧
  本来当切换角色时，会重新执行 populate_ 函数，并且重新把 flyout 显示出来
  在这里加多一个判断 this.isHideFlyout_ 状态，如果是true，则再次将其隐藏起来
  PS：
      看到这里一定会好奇，为什么不直接在 populate_ 函数上判断 this.isHideFlyout_？
      确实，一开始也是在 populate_ 函数中加判断逻辑的，但最后发现，如果在 populate_ 函数中加判断实现下面 if 中类似的效果时，会有 bug：
          1. 当在角色上将 this.isHideFlyout_ 变成 true，然后切换到背景，然后点击 category，则积木块定位会不准
          2. 当在背景上将 this.isHideFlyout_ 变成 true，然后切换到角色，然后点击 category，则积木块定位会不准
          3. 神奇的是，当在角色上将 this.isHideFlyout_ 变成 true，然后切换到另一个角色，然后点击 category，则积木块定位居然是准确的
      百思不得其解后，才采用现在这个方案：populate_ 函数的逻辑不改，在这里增加多一个判断 */
  if (this.isHideFlyout_) {
    this.flyout_.hide();
    this.workspace_.resize();
  }
};

/**
 * Select and scroll to a category by name.
 * @param {string} name The name of the category to select and scroll to.
 */
Blockly.Toolbox.prototype.setSelectedCategoryByName = function(name) {
  this.selectCategoryByName(name);
  this.scrollToCategoryByName(name);
};

/**
 * Select and scroll to a category by id.
 * @param {string} id The id of the category to select and scroll to.
 * @public
 */
Blockly.Toolbox.prototype.setSelectedCategoryById = function(id) {
  this.selectCategoryById(id);
  this.scrollToCategoryById(id);
};

/**
 * Scroll to a category by name.
 * @param {string} name The name of the category to scroll to.
 * @package
 */
Blockly.Toolbox.prototype.scrollToCategoryByName = function(name) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (name === scrollPositions[i].categoryName) {
      this.flyout_.setVisible(true);
      this.flyout_.scrollTo(scrollPositions[i].position);
      return;
    }
  }
};

/**
 * Scroll to a category by id.
 * @param {string} id The id of the category to scroll to.
 * @public
 */
Blockly.Toolbox.prototype.scrollToCategoryById = function(id) {
  var scrollPositions = this.flyout_.categoryScrollPositions;
  for (var i = 0; i < scrollPositions.length; i++) {
    if (id === scrollPositions[i].categoryId) {
      this.flyout_.setVisible(true);
      this.flyout_.scrollTo(scrollPositions[i].position);
      return;
    }
  }
};

/**
 * Get a category by its index.
 * @param  {number} index The index of the category.
 * @return {Blockly.Toolbox.Category} the category, or null if there are no categories.
 * @package
 */
Blockly.Toolbox.prototype.getCategoryByIndex = function(index) {
  if (!this.categoryMenu_.categories_) return null;
  return this.categoryMenu_.categories_[index];
};

/**
 * Select a category by name.
 * @param {string} name The name of the category to select.
 * @package
 */
Blockly.Toolbox.prototype.selectCategoryByName = function(name) {
  for (var i = 0; i < this.categoryMenu_.categories_.length; i++) {
    var category = this.categoryMenu_.categories_[i];
    if (name === category.name_) {
      this.selectedItem_.setSelected(false);
      this.selectedItem_ = category;
      this.selectedItem_.setSelected(true);
    }
  }
};

/**
 * Select a category by id.
 * @param {string} id The id of the category to select.
 * @package
 */
Blockly.Toolbox.prototype.selectCategoryById = function(id) {
  for (var i = 0; i < this.categoryMenu_.categories_.length; i++) {
    var category = this.categoryMenu_.categories_[i];
    if (id === category.id_) {
      this.selectedItem_.setSelected(false);
      this.selectedItem_ = category;
      this.selectedItem_.setSelected(true);
    }
  }
};

/**
 * Wrapper function for calling setSelectedItem from a touch handler.
 * @param {Blockly.Toolbox.Category} item The category to select.
 * @return {function} A function that can be passed to bindEvent.
 */
Blockly.Toolbox.prototype.setSelectedItemFactory = function(item) {
  var selectedItem = item;
  return function() {
    if (!this.workspace_.isDragging()) {
      this.setSelectedItem(selectedItem);
      Blockly.Touch.clearTouchIdentifier();
    }
  };
};

// Category menu
/**
 * Class for a table of category titles that will control which category is
 * displayed.
 * @param {Blockly.Toolbox} parent The toolbox that owns the category menu.
 * @param {Element} parentHtml The containing html div.
 * @constructor
 */
Blockly.Toolbox.CategoryMenu = function(parent, parentHtml) {
  this.parent_ = parent;
  this.height_ = 0;
  this.parentHtml_ = parentHtml;
  this.createDom();
  this.categories_ = [];
};

/**
 * @return {number} the height of the category menu.
 */
Blockly.Toolbox.CategoryMenu.prototype.getHeight = function() {
  return this.height_;
};

/**
 * Create the DOM for the category menu.
 */
Blockly.Toolbox.CategoryMenu.prototype.createDom = function() {
  this.table = goog.dom.createDom('div', this.parent_.horizontalLayout_ ?
    'scratchCategoryMenuHorizontal' : 'scratchCategoryMenu');
  this.parentHtml_.appendChild(this.table);
};

/**
 * Fill the toolbox with categories and blocks by creating a new
 * {Blockly.Toolbox.Category} for every category tag in the toolbox xml.
 * @param {Node} domTree DOM tree of blocks, or null.
 */
Blockly.Toolbox.CategoryMenu.prototype.populate = function(domTree) {
  if (!domTree) {
    return;
  }

  // Remove old categories
  this.dispose();
  this.createDom();
  var categories = [];
  // Find actual categories from the DOM tree.
  for (var i = 0, child; child = domTree.childNodes[i]; i++) {
    if (!child.tagName || child.tagName.toUpperCase() != 'CATEGORY') {
      continue;
    }
    categories.push(child);
  }

  // Create a single column of categories
  for (var i = 0; i < categories.length; i++) {
    var child = categories[i];
    var row = goog.dom.createDom('div', 'scratchCategoryMenuRow');
    this.table.appendChild(row);
    if (child) {
      this.categories_.push(new Blockly.Toolbox.Category(this, row,
          child));
    }
  }
  this.height_ = this.table.offsetHeight;
};

/**
 * Dispose of this Category Menu and all of its children.
 */
Blockly.Toolbox.CategoryMenu.prototype.dispose = function() {
  for (var i = 0, category; category = this.categories_[i]; i++) {
    category.dispose();
  }
  this.categories_ = [];
  if (this.table) {
    goog.dom.removeNode(this.table);
    this.table = null;
  }
};


// Category
/**
 * Class for the data model of a category in the toolbox.
 * @param {Blockly.Toolbox.CategoryMenu} parent The category menu that owns this
 *     category.
 * @param {Element} parentHtml The containing html div.
 * @param {Node} domTree DOM tree of blocks.
 * @constructor
 */
Blockly.Toolbox.Category = function(parent, parentHtml, domTree) {
  this.parent_ = parent;
  this.parentHtml_ = parentHtml;
  this.name_ = domTree.getAttribute('name');
  this.id_ = domTree.getAttribute('id');
  this.setColour(domTree);
  this.custom_ = domTree.getAttribute('custom');
  this.iconURI_ = domTree.getAttribute('iconURI');
  this.showStatusButton_ = domTree.getAttribute('showStatusButton');
  this.contents_ = [];
  if (!this.custom_) {
    this.parseContents_(domTree);
  }
  this.createDom();
};

/**
 * Dispose of this category and all of its contents.
 */
Blockly.Toolbox.Category.prototype.dispose = function() {
  if (this.item_) {
    goog.dom.removeNode(this.item_);
    this.item = null;
  }
  this.parent_ = null;
  this.parentHtml_ = null;
  this.contents_ = null;
};

/**
 * Used to determine the css classes for the menu item for this category
 * based on its current state.
 * @private
 * @param {boolean=} selected Indication whether the category is currently selected.
 * @return {string} The css class names to be applied, space-separated.
 */
Blockly.Toolbox.Category.prototype.getMenuItemClassName_ = function(selected) {
  var classNames = [
    'scratchCategoryMenuItem',
    'scratchCategoryId-' + this.id_,
  ];
  if (selected) {
    classNames.push('categorySelected');
  }
  return classNames.join(' ');
};

/**
 * Create the DOM for a category in the toolbox.
 */
Blockly.Toolbox.Category.prototype.createDom = function() {
  var toolbox = this.parent_.parent_;
  this.item_ = goog.dom.createDom('div',
      {'class': this.getMenuItemClassName_()});
  this.label_ = goog.dom.createDom('div',
      {'class': 'scratchCategoryMenuItemLabel'},
      Blockly.utils.replaceMessageReferences(this.name_));
  if (this.iconURI_) {
    this.bubble_ = goog.dom.createDom('div',
        {'class': 'scratchCategoryItemIcon'});
    this.bubble_.style.backgroundImage = 'url(' + this.iconURI_ + ')';
  } else {
    this.bubble_ = goog.dom.createDom('div',
        {'class': 'scratchCategoryItemBubble'});
    this.bubble_.style.backgroundColor = this.colour_;
    this.bubble_.style.borderColor = this.secondaryColour_;
  }
  this.item_.appendChild(this.bubble_);
  this.item_.appendChild(this.label_);
  this.parentHtml_.appendChild(this.item_);
  Blockly.bindEvent_(
      this.item_, 'mouseup', toolbox, toolbox.setSelectedItemFactory(this));
};

/**
 * Set the selected state of this category.
 * @param {boolean} selected Whether this category is selected.
 */
Blockly.Toolbox.Category.prototype.setSelected = function(selected) {
  this.item_.className = this.getMenuItemClassName_(selected);
};

/**
 * Set the contents of this category from DOM.
 * @param {Node} domTree DOM tree of blocks.
 * @constructor
 */
Blockly.Toolbox.Category.prototype.parseContents_ = function(domTree) {
  for (var i = 0, child; child = domTree.childNodes[i]; i++) {
    if (!child.tagName) {
      // Skip
      continue;
    }
    switch (child.tagName.toUpperCase()) {
      case 'BLOCK':
      case 'SHADOW':
      case 'LABEL':
      case 'BUTTON':
      case 'SEP':
      case 'TEXT':
        this.contents_.push(child);
        break;
      default:
        break;
    }
  }
};

/**
 * Get the contents of this category.
 * @return {!Array|string} xmlList List of blocks to show, or a string with the
 *     name of a custom category.
 */
Blockly.Toolbox.Category.prototype.getContents = function() {
  return this.custom_ ? this.custom_ : this.contents_;
};

/**
 * Set the colour of the category's background from a DOM node.
 * @param {Node} node DOM node with "colour" and "secondaryColour" attribute.
 *     Colours are a hex string or hue on a colour wheel (0-360).
 */
Blockly.Toolbox.Category.prototype.setColour = function(node) {
  var colour = node.getAttribute('colour');
  var secondaryColour = node.getAttribute('secondaryColour');
  if (goog.isString(colour)) {
    if (colour.match(/^#[0-9a-fA-F]{6}$/)) {
      this.colour_ = colour;
    } else {
      this.colour_ = Blockly.hueToRgb(colour);
    }
    if (secondaryColour.match(/^#[0-9a-fA-F]{6}$/)) {
      this.secondaryColour_ = secondaryColour;
    } else {
      this.secondaryColour_ = Blockly.hueToRgb(secondaryColour);
    }
    this.hasColours_ = true;
  } else {
    this.colour_ = '#000000';
    this.secondaryColour_ = '#000000';
  }
};
