// cache scrollbar width
var scrollbarWidth;

var _ = {
  
  slice: Array.prototype.slice,
  keys: Object.keys,

  isElement: function (obj) {
    return !!(obj && obj.nodeType === 1);
  },

  toHTML: function (els) {
    var html, 
      temp = document.createElement('div');
    
    els = els.length ? _.slice.call(els) : [els];
    
    for (let el of els) {
      temp.appendChild(el);
    }
    
    html = temp.innerHTML;
    temp = null;
    
    return html;
  },

  unwrap: function (el) {
    var node,
      parent = el.parentNode,
      frag = document.createDocumentFragment();
    
    while ((node = el.firstChild)) {
      frag.appendChild(node);
    }

    parent.insertBefore(frag, el);
    parent.removeChild(el);

    return frag;
  },

  closest: function (child, parent) {
    var node;

    while (node = child.parentNode) {
      if (node === parent) {
        return node;
      }
    }
  },

  getTextNodes: function (node) {
    var nodes = [];

    if (node.nodeType === 3) {
      nodes.push(node);
    
    } else {
      let children = _.slice.call(node.childNodes);

      for (let child of children) {
        nodes.push.apply(nodes, _.getTextNodes(child));
      }
    }

    return nodes;
  },

  scrollbarWidth: function () {
    if (scrollbarWidth) { return scrollbarWidth; }

    var widthNoScroll, widthWithScroll,
      outer = document.createElement("div"),
      inner = outer.cloneNode();

    outer.style.visibility = "hidden";
    outer.style.width = "100px";

    document.body.appendChild(outer);

    widthNoScroll = outer.offsetWidth;
    outer.style.overflow = "scroll";

    inner.style.width = "100%";
    outer.appendChild(inner);        

    widthWithScroll = inner.offsetWidth;

    outer.parentNode.removeChild(outer);

    return (scrollbarWidth = widthNoScroll - widthWithScroll);
  },

  noop: function () {},

  now: Date.now,

  delay: function (fn, wait) {
    var args = _.slice.call(arguments, 2);
    return setTimeout(function () {
      return fn.apply(null, args);
    }, wait);
  },

  defer: function (fn) {
    return _.delay.apply(_, [fn, 1].concat(_.slice.call(arguments, 1)));
  },

  debounce: function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  }
};

export default _;
