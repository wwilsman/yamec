import _ from './helpers';

class Selection {
  constructor() {
    if (this.constructor.instance) {
      return this.constructor.instance;
    }

    this.constructor.instance = this;
  }

  get() {
    return window.getSelection();
  }

  save() {
    var saved = [],
      range = this.range;

    saved[0] = range.commonAncestorContainer;
    saved[2] = this.getCaretOffset(saved[0]);
    saved[1] = saved[2] - range.toString().length;

    this.saved = saved;
  }

  restore() {
    this.select.apply(this, this.saved);
  }

  getRangeBoundary() {
    return this.range.getBoundingClientRect();
  }

  collapseToEnd() {
    this.get().collapseToEnd();
  }

  select(node, start, end) {
    var selection = this.get(),
     range = document.createRange();

    range.selectNode(node);

    if (start !== undefined && end !== undefined) {
      let textNodes = _.getTextNodes(node);
      let foundStart = false;
      let charCount = 0;
      let endCharCount;

      for (let textNode of textNodes) {
        endCharCount = charCount + textNode.length;

        if (!foundStart && start >= charCount &&
            (start < endCharCount || start === endCharCount)) {
          range.setStart(textNode, start - charCount);
          foundStart = true;
        }

        if (foundStart && end <= endCharCount) {
          range.setEnd(textNode, end - charCount);
          break;
        }

        charCount = endCharCount;
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  replace(content) {
    var node, lastNode,
      selection = this.get(),
      range = this.range,
      expandedRange = range.cloneRange(),
      temp = document.createElement('div'),
      frag = document.createDocumentFragment();

    temp.innerHTML = content;

    while ((node = temp.firstChild)) {
      lastNode = frag.appendChild(node);
    }

    range.deleteContents();
    range.insertNode(frag);

    if (lastNode) {
      expandedRange.setEndAfter(lastNode);
      selection.removeAllRanges();
      selection.addRange(expandedRange);
    }
  }

  getCaretOffset(node) {
    var range = this.range;

    var preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(node);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  contains(tagName) {
    var tagReg = new RegExp('<' + tagName + '(.*?)>|</' + tagName + '>');
    return tagReg.test(this.html);
  }

  isWithin(tagName, limitNode) {
    var ret = [], 
      range = this.range,
      startParent = range.startContainer.parentNode,
      endParent = range.endContainer.parentNode,
      node = range.commonAncestorContainer;

    // correct `tagName`
    tagName = tagName.toUpperCase();

    // `startParent` has `tagName`
    if (startParent.tagName === tagName) {
      ret.push(startParent);
    }

    // `endParent` isn't `startParent` and it has `tagName`
    if (endParent !== startParent && endParent.tagName === tagName) {
      ret.push(endParent);
    }

    // if `startParent` or `endParent` match, we're done
    if (ret.length > 0) {
      return ret;
    }

    // limit to body
    limitNode = undefined === limitNode ? document.body : limitNode;

    // check each ancestor
    while (node && node !== limitNode) {

      // if there's a match, return with it
      if (node.tagName && node.tagName === tagName) {
        ret.push(node);
        return ret;
      }

      node = node.parentNode
    }

    // no matches
    return false;
  }

  get html() {
    return _.toHTML(this.range.cloneContents());
  }

  get isCollapsed() {
    return this.get().isCollapsed;
  }

  get range() {
    return this.get().getRangeAt(0);
  }
}

export default Selection;
