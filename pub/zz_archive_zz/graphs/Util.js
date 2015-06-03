/*jslint node: true */
"use strict";

// ##############################################################################################################
// Debug stuff


/**
 * Returns a string identifying the caller of the caller of this function.
 * Only works on English locale.
 */
function getCallerInfo() {
    try { throw new Error(''); } catch (err) {
        var callerLine = err.stack.split("\n")[4];        // get line of caller
        var index = callerLine.indexOf("at ");
        return callerLine.slice(index + 3, callerLine.length);
    }
}

/**
 * Standard assert statement.
 * Throws a string identifying caller, if assertion does not hold.
 */
function assert(stmt, msg) {
    if (!stmt) {
        var info = "";
        if (msg) {
            info += msg + " -- ";
        }
        info += "ASSERTION FAILED at " + getCallerInfo();
        throw info;
    }
}

// ##############################################################################################################
// File path stuff

/**
 * Concats two partial paths with a "/".
 */
function concatPath2(root, file1) {
    var path = root;
    if (!path.endsWith("/") && !path.endsWith("\\")) {
        path += "/";
    }
    path += file1;
    return path;
}

/**
 * Concats multiple partial paths by "/".
 * 
 * @param root
 * @param file1
 */
function concatPath(root, file1/*, fileN */) {
    var path = concatPath2(root, file1);

    for (var argLen = arguments.length, i = 2; i < argLen; ++i) {
        path = concatPath2(path, arguments[i]);
    }
    return path;
}


// ##############################################################################################################
// Arrays

/**
 * Creates an array of given size.
 * If the optional defaultVal parameter is supplied,
 * initializes every element with it.
 * NOTE: There is a design bug in Google's V8 JS engine that sets an arbitrary threshold of 99999 to be the max size for array pre-allocation.
 * @param {number} size Number of elements to be allocated.
 * @param {Object=} defaultVal Optional value to be used to set all array elements.
 */
function createArray(size, defaultVal) {
    var arr = new Array(size);
    if (arguments.length == 2) {
        // optional default value
        for (var i = 0; i < size; ++i) {
            if (typeof defaultVal == "object")
                arr[i] = defaultVal.clone(null, false);     // shallow-copy default value
            else
                arr[i] = defaultVal;                        // simply copy it
        }
    }
    return arr;
}


// ##############################################################################################################
// Object

/**
 * Adds a deep copy method to every object.
 * @param newObj The object to clone all properties to.
 * @param {bool} deepCopy Whether to deep-copy elements (true by default).
 */
Object.prototype.clone = function(newObj, deepCopy) {
  if (arguments.length === 0 || newObj === null) {
    newObj = (this instanceof Array) ? [] : {};
  }
  if (arguments.length < 2) {
    deepCopy = true;
  }
  
  for (var i in this) {
    if (deepCopy && typeof this[i] == "object") {
        newObj[i] = this[i].clone();
    }
    else {
        newObj[i] = this[i];
    }
  }
  return newObj;
};


/**
 * Determines how many properties the given object has.
 *
 * @see http://stackoverflow.com/questions/5533192/how-to-get-object-length-in-jquery
 */
Object.prototype.getObjectPropertyCount = function() {
    var size = 0;
    for (var i in this) {
        ++size;
    }
    return size;
};


/**
 * Checks whether the given type indicates that the object has been declared and assigned a value.
 *
 * @param objType
 */
function isDefinedType(objType) {
    return objType != "undefined";
}

/**
 * Checks whether the given object has been assigned a value and is not null nor false.
 *
 * @param obj
 */
function isSet(obj)
{
    return obj !== null && obj !== false;
}

/**
 * Checks whether the given object has the given property
 *
 * @param obj
 * @param key
 */
Object.prototype.hasProperty = function(key) {
    return this.getObjectSize(this.key) === 0;
};

/**
 * Returns the first property of the given object.
 */
Object.prototype.getFirstProperty = function()
{
    for (var prop in this)
        return this[prop];
};

/** 
 * Echo object to console, using JSon.
 */
function logObject(msg, obj)
{
    console.log(msg + ": " + JSON.stringify(obj, null, 4) );
}



// ##############################################################################################################
// String

// add utilities to string
String.prototype.startsWith = function(prefix) {
    return this.substring(0, prefix.length) === prefix;
};
String.prototype.endsWith = function(suffix) {
    return this.substring(this.length - suffix.length, this.length) === suffix;
};


// ##############################################################################################################
// Other

/**
 * Returns the current system time in milliseconds for global synchronization and timing events.
 */
function getCurrentTimeMillis()
{
    return new Date().getTime();
}

/**
 * Returns a hashmap of all GET arguments of the current URL.
 *
 * @see http://stackoverflow.com/questions/5448545/how-to-retrieve-get-parameters-from-javascript
 */
function retrieveURLArguments()
{
    var prmstr = window.location.search.substr(1);
    var prmarr = prmstr.split ("&");
    var params = {};

    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}




// ##############################################################################################################
// JQuery

// add some utilities to jQuery
if (window.jQuery)
{
    $( document ).ready(function() {
        // add centering functionality to jQuery components
        // see: http://stackoverflow.com/questions/950087/how-to-include-a-javascript-file-in-another-javascript-file
        jQuery.fn.center = function (relativeParent) {
            if (undefined === relativeParent) relativeParent = $(window);
            var elem = $(this);
            
            var parentOffset = relativeParent.offset();
            var leftOffset = Math.max(0, ((relativeParent.outerWidth() - elem.outerWidth()) / 2) + relativeParent.scrollLeft());
            var topOffset = Math.max(0, ((relativeParent.outerHeight() - elem.outerHeight()) / 2) + relativeParent.scrollTop());
            if (undefined !== parentOffset)
            {
                leftOffset += parentOffset.left;
                topOffset += parentOffset.top;
            }
            elem.offset({left : leftOffset, top : topOffset});
            return this;
        };
        
        jQuery.fn.centerWidth = function (relativeParent) {
            if (undefined === relativeParent) relativeParent = $(window);
            var elem = $(this);
            
            
            var parentOffset = relativeParent.offset();
            var leftOffset = Math.max(0, ((relativeParent.outerWidth() - elem.outerWidth()) / 2) + relativeParent.scrollLeft());
            if (undefined != parentOffset)
            {
                leftOffset += parentOffset.left;
            }
            elem.offset({left : leftOffset, top : elem.offset().top});
            return this;
        };
        
        // Add text width measurement tool to jQuery components
        // see: http://stackoverflow.com/questions/1582534/calculating-text-width-with-jquery
        $.fn.textWidth = function(){
          var html_org = $(this).html();
          var html_calc = '<span>' + html_org + '</span>';
          $(this).html(html_calc);
          var width = $(this).find('span:first').width();
          $(this).html(html_org);
          return width;
        };
    });
}


// ##############################################################################################################
// Stable merge sort

// Add stable merge sort to Array prototypes.
// Note: We wrap it in a closure so it doesn't pollute the global
//       namespace, but we don't put it in $(document).ready, since it's
//       not dependent on the DOM.
(function() {

  // expose to Array
  Array.prototype.stableSort = stableSort;

  /**
   * Performs a stable merge sort on this array.
   * Note that it does not change the array, but returns a fresh copy.
   * 
   * @param compare The compare function to be used.
   * @see http://stackoverflow.com/questions/1427608/fast-stable-sorting-algorithm-implementation-in-javascript
   */
  function stableSort(compare) {
    var length = this.length,
        middle = Math.floor(length / 2);

    if (!compare) {
      compare = function(left, right) {
        if (left < right) 
          return -1;
        if (left == right)
          return 0;
        else
          return 1;
      };
    }

    if (length < 2)
      return this.slice();

    return merge(
      this.slice(0, middle).msort(compare),
      this.slice(middle, length).msort(compare),
      compare
    );
  }

  function merge(left, right, compare) {

    var result = [];

    while (left.length > 0 || right.length > 0) {
      if (left.length > 0 && right.length > 0) {
        if (compare(left[0], right[0]) <= 0) {
          result.push(left[0]);
          left = left.slice(1);
        }
        else {
          result.push(right[0]);
          right = right.slice(1);
        }
      }
      else if (left.length > 0) {
        result.push(left[0]);
        left = left.slice(1);
      }
      else if (right.length > 0) {
        result.push(right[0]);
        right = right.slice(1);
      }
    }
    return result;
  }
})();