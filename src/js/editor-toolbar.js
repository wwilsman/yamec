import _ from './helpers';

const DIRREG = /(?:^|\s)(pm--(top|bottom|left|right))(?:\s|$)/;

class EditorToolbar {
  constructor(opts = {}) {

    this.buttons = opts.buttons || {};
    
    document.body.appendChild(this.build());

    this.position(opts.position || 'top');
    this.cancelInput = opts.onInputCancel || _.noop;

    this.hide();
  }

  show(x, y) {

    this.dom.style.display = '';
    this.dom.style.top = y + 'px';
    this.dom.style.left = x + 'px';

    // prevent animation from not running
    _.defer(() => this.dom.classList.add('pm--show'));

    // check if buttons should be active
    this.buttons.forEach(btn => btn.toggle());

    return this;
  }

  hide() {
    this.dom.style.display = 'none';
    this.dom.style.top = this.dom.style.left = '';
    this.dom.classList.remove('pm--show');
    this.toggleInput(false);
    return this;
  }

  get visible() {
    return this.dom.classList.contains('pm--show');
  }

  toggleInput(placeholder, value, callback, force) {
    var ctrl = this.dom.firstChild.lastChild,
      visible = ctrl.style.display === 'block';

    // `force` argument always comes last
    let lastArg = arguments[arguments.length - 1];
    force = typeof lastArg === 'boolean' ? lastArg : undefined;

    // `callback` can sometimes be second argument
    callback = typeof value === 'function' ? value : callback;
    callback = typeof callback === 'function' ? callback : undefined;

    // `placeholder` and `value` must be strings
    placeholder = typeof placeholder === 'string' ? placeholder : '';
    value = typeof value === 'string' ? value : '';

    // cannot show input when toolbar is to left or right
    if (/left|right/.test(this.position())) {
      force = false;
    }

    // override `visible` when forced
    visible = undefined === force ? visible : !force;

    // set properties
    ctrl.firstChild.setAttribute('placeholder', placeholder);
    ctrl.firstChild.value = value;

    // not visible
    if (!visible) {
      this.inputCallback = callback || _.noop;

      // set explicit width for transition
      this.dom.style.width = this.dom.offsetWidth + 'px';

      // show input with proper width
      ctrl.style.display = 'block';

      let biggerInput = this.dom.offsetWidth < ctrl.offsetWidth;
      this.dom.style.width = biggerInput ? ctrl.offsetWidth + 'px' : '';

      // prevent animation from not running
      _.defer(() => this.dom.classList.add('pm--input'));

    // visible
    } else {
      
      // reset everything
      ctrl.style.display = '';
      ctrl.firstChild.value = '';
      this.inputCallback = _.noop;
      this.dom.style.width = '';
      this.dom.classList.remove('pm--input');
    }
  }

  position(dir) {
    var olddir = DIRREG.exec(this.dom.className);

    // no arguments; return current position
    if (undefined === dir) { 
      return olddir[2] || null; 
    }

    // unrecognized direction
    if (!/top|bottom|left|right/.test(dir)) {
      return false;
    }
    
    // remove old direction
    if (olddir) {
      this.dom.classList.remove(olddir[1]);
    }

    // add new direction
    this.dom.classList.add('pm--' + dir);
    
    // input is disabled for left and right positioned
    if (/left|right/.test(dir)) {
      this.toggleInput(false);
    }

    return this;
  }

  build() {
    var dom = document.createElement('div');
    dom.className = 'pm';

    // add list element
    dom.appendChild(document.createElement('ul'));
    
    // add each button and attatch events
    this.buttons.forEach((btn, i, btns) => {
      var element = document.createElement('button');
      element.setAttribute('type', 'button');
      element.className = 'pm__btn';

      // add special class to first and last button
      if (i === 0) {
        element.classList.add('pm__btn--first');
      } else if (i === btns.length - 1) {
        element.classList.add('pm__btn--last');
      }

      // customize button
      element.classList.add(btn.className);
      element.innerHTML = btn.content;

      // do button action on click
      element.addEventListener('click', btn.action.bind(this));

      // append button to list element
      btn.element = dom.firstChild
        .appendChild(document.createElement('li'))
        .appendChild(element);
      
      // toggle button's active state
      btn.toggle = () => {
        element.classList.toggle('active', btn.active());
      };
    });
    
    // add input to list element
    let input = dom.firstChild
      .appendChild(document.createElement('li'))
      .appendChild(document.createElement('input'));

    input.className = 'pm__control';

    // on enter, do input action
    this.inputCallback = _.noop;
    input.addEventListener('keyup', event => {
      if ((event.which || event.keyCode) === 13) {
        this.inputCallback(input.value);
        this.toggleInput(false);
      }
    });

    // after input transitions, focus it
    input.parentNode.addEventListener('transitionend', () => input.focus());
    
    // add cancel element to input container
    input.parentNode
      .appendChild(document.createElement('div'))
      .className = 'pm__cancel';

    // close input on cancel
    input.nextElementSibling
      .addEventListener('click', () => {
        this.toggleInput(false);
        this.cancelInput();
      });

    return (this.dom = dom);
  }
}

export default EditorToolbar;
