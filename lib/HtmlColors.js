"use strict";

/**
 * @see http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 */
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * @see http://codingforums.com/post-php-snippet/312408-array-140-universal-html-colors.html
 */
var colorObject = {"white":{"hex":"FFFFFF","rgb":{"r":255,"g":255,"b":255}},"gray":{"hex":"808080","rgb":{"r":128,"g":128,"b":128}},"silver":{"hex":"C0C0C0","rgb":{"r":192,"g":192,"b":192}},"black":{"hex":"000000","rgb":{"r":0,"g":0,"b":0}},"maroon":{"hex":"800000","rgb":{"r":128,"g":0,"b":0}},"red":{"hex":"FF0000","rgb":{"r":255,"g":0,"b":0}},"purple":{"hex":"800080","rgb":{"r":128,"g":0,"b":128}},"fuchsia":{"hex":"FF00FF","rgb":{"r":255,"g":0,"b":255}},"green":{"hex":"008000","rgb":{"r":0,"g":128,"b":0}},"lime":{"hex":"00FF00","rgb":{"r":0,"g":255,"b":0}},"olive":{"hex":"808000","rgb":{"r":128,"g":128,"b":0}},"yellow":{"hex":"FFFF00","rgb":{"r":255,"g":255,"b":0}},"navy":{"hex":"000080","rgb":{"r":0,"g":0,"b":128}},"blue":{"hex":"0000FF","rgb":{"r":0,"g":0,"b":255}},"teal":{"hex":"008080","rgb":{"r":0,"g":128,"b":128}},"aqua":{"hex":"00FFFF","rgb":{"r":0,"g":255,"b":255}},"orange":{"hex":"FFA500","rgb":{"r":255,"g":165,"b":0}},"indianred":{"hex":"CD5C5C","rgb":{"r":205,"g":92,"b":92}},"lightcoral":{"hex":"F08080","rgb":{"r":240,"g":128,"b":128}},"salmon":{"hex":"FA8072","rgb":{"r":250,"g":128,"b":114}},"darksalmon":{"hex":"E9967A","rgb":{"r":233,"g":150,"b":122}},"lightsalmon":{"hex":"FFA07A","rgb":{"r":255,"g":160,"b":122}},"crimson":{"hex":"DC143C","rgb":{"r":220,"g":20,"b":60}},"firebrick":{"hex":"B22222","rgb":{"r":178,"g":34,"b":34}},"darkred":{"hex":"8B0000","rgb":{"r":139,"g":0,"b":0}},"pink":{"hex":"FFC0CB","rgb":{"r":255,"g":192,"b":203}},"lightpink":{"hex":"FFB6C1","rgb":{"r":255,"g":182,"b":193}},"hotpink":{"hex":"FF69B4","rgb":{"r":255,"g":105,"b":180}},"deeppink":{"hex":"FF1493","rgb":{"r":255,"g":20,"b":147}},"mediumvioletred":{"hex":"C71585","rgb":{"r":199,"g":21,"b":133}},"palevioletred":{"hex":"DB7093","rgb":{"r":219,"g":112,"b":147}},"coral":{"hex":"FF7F50","rgb":{"r":255,"g":127,"b":80}},"tomato":{"hex":"FF6347","rgb":{"r":255,"g":99,"b":71}},"orangered":{"hex":"FF4500","rgb":{"r":255,"g":69,"b":0}},"darkorange":{"hex":"FF8C00","rgb":{"r":255,"g":140,"b":0}},"gold":{"hex":"FFD700","rgb":{"r":255,"g":215,"b":0}},"lightyellow":{"hex":"FFFFE0","rgb":{"r":255,"g":255,"b":224}},"lemonchiffon":{"hex":"FFFACD","rgb":{"r":255,"g":250,"b":205}},"lightgoldenrodyellow":{"hex":"FAFAD2","rgb":{"r":250,"g":250,"b":210}},"papayawhip":{"hex":"FFEFD5","rgb":{"r":255,"g":239,"b":213}},"moccasin":{"hex":"FFE4B5","rgb":{"r":255,"g":228,"b":181}},"peachpuff":{"hex":"FFDAB9","rgb":{"r":255,"g":218,"b":185}},"palegoldenrod":{"hex":"EEE8AA","rgb":{"r":238,"g":232,"b":170}},"khaki":{"hex":"F0E68C","rgb":{"r":240,"g":230,"b":140}},"darkkhaki":{"hex":"BDB76B","rgb":{"r":189,"g":183,"b":107}},"lavender":{"hex":"E6E6FA","rgb":{"r":230,"g":230,"b":250}},"thistle":{"hex":"D8BFD8","rgb":{"r":216,"g":191,"b":216}},"plum":{"hex":"DDA0DD","rgb":{"r":221,"g":160,"b":221}},"violet":{"hex":"EE82EE","rgb":{"r":238,"g":130,"b":238}},"orchid":{"hex":"DA70D6","rgb":{"r":218,"g":112,"b":214}},"magenta":{"hex":"FF00FF","rgb":{"r":255,"g":0,"b":255}},"mediumorchid":{"hex":"BA55D3","rgb":{"r":186,"g":85,"b":211}},"mediumpurple":{"hex":"9370DB","rgb":{"r":147,"g":112,"b":219}},"blueviolet":{"hex":"8A2BE2","rgb":{"r":138,"g":43,"b":226}},"darkviolet":{"hex":"9400D3","rgb":{"r":148,"g":0,"b":211}},"darkorchid":{"hex":"9932CC","rgb":{"r":153,"g":50,"b":204}},"darkmagenta":{"hex":"8B008B","rgb":{"r":139,"g":0,"b":139}},"indigo":{"hex":"4B0082","rgb":{"r":75,"g":0,"b":130}},"slateblue":{"hex":"6A5ACD","rgb":{"r":106,"g":90,"b":205}},"darkslateblue":{"hex":"483D8B","rgb":{"r":72,"g":61,"b":139}},"mediumslateblue":{"hex":"7B68EE","rgb":{"r":123,"g":104,"b":238}},"greenyellow":{"hex":"ADFF2F","rgb":{"r":173,"g":255,"b":47}},"chartreuse":{"hex":"7FFF00","rgb":{"r":127,"g":255,"b":0}},"lawngreen":{"hex":"7CFC00","rgb":{"r":124,"g":252,"b":0}},"limegreen":{"hex":"32CD32","rgb":{"r":50,"g":205,"b":50}},"palegreen":{"hex":"98FB98","rgb":{"r":152,"g":251,"b":152}},"lightgreen":{"hex":"90EE90","rgb":{"r":144,"g":238,"b":144}},"mediumspringgreen":{"hex":"00FA9A","rgb":{"r":0,"g":250,"b":154}},"springgreen":{"hex":"00FF7F","rgb":{"r":0,"g":255,"b":127}},"mediumseagreen":{"hex":"3CB371","rgb":{"r":60,"g":179,"b":113}},"seagreen":{"hex":"2E8B57","rgb":{"r":46,"g":139,"b":87}},"forestgreen":{"hex":"228B22","rgb":{"r":34,"g":139,"b":34}},"darkgreen":{"hex":"006400","rgb":{"r":0,"g":100,"b":0}},"yellowgreen":{"hex":"9ACD32","rgb":{"r":154,"g":205,"b":50}},"olivedrab":{"hex":"6B8E23","rgb":{"r":107,"g":142,"b":35}},"darkolivegreen":{"hex":"556B2F","rgb":{"r":85,"g":107,"b":47}},"mediumaquamarine":{"hex":"66CDAA","rgb":{"r":102,"g":205,"b":170}},"darkseagreen":{"hex":"8FBC8F","rgb":{"r":143,"g":188,"b":143}},"lightseagreen":{"hex":"20B2AA","rgb":{"r":32,"g":178,"b":170}},"darkcyan":{"hex":"008B8B","rgb":{"r":0,"g":139,"b":139}},"cyan":{"hex":"00FFFF","rgb":{"r":0,"g":255,"b":255}},"lightcyan":{"hex":"E0FFFF","rgb":{"r":224,"g":255,"b":255}},"paleturquoise":{"hex":"AFEEEE","rgb":{"r":175,"g":238,"b":238}},"aquamarine":{"hex":"7FFFD4","rgb":{"r":127,"g":255,"b":212}},"turquoise":{"hex":"40E0D0","rgb":{"r":64,"g":224,"b":208}},"mediumturquoise":{"hex":"48D1CC","rgb":{"r":72,"g":209,"b":204}},"darkturquoise":{"hex":"00CED1","rgb":{"r":0,"g":206,"b":209}},"cadetblue":{"hex":"5F9EA0","rgb":{"r":95,"g":158,"b":160}},"steelblue":{"hex":"4682B4","rgb":{"r":70,"g":130,"b":180}},"lightsteelblue":{"hex":"B0C4DE","rgb":{"r":176,"g":196,"b":222}},"powderblue":{"hex":"B0E0E6","rgb":{"r":176,"g":224,"b":230}},"lightblue":{"hex":"ADD8E6","rgb":{"r":173,"g":216,"b":230}},"skyblue":{"hex":"87CEEB","rgb":{"r":135,"g":206,"b":235}},"lightskyblue":{"hex":"87CEFA","rgb":{"r":135,"g":206,"b":250}},"deepskyblue":{"hex":"00BFFF","rgb":{"r":0,"g":191,"b":255}},"dodgerblue":{"hex":"1E90FF","rgb":{"r":30,"g":144,"b":255}},"cornflowerblue":{"hex":"6495ED","rgb":{"r":100,"g":149,"b":237}},"royalblue":{"hex":"4169E1","rgb":{"r":65,"g":105,"b":225}},"mediumblue":{"hex":"0000CD","rgb":{"r":0,"g":0,"b":205}},"darkblue":{"hex":"00008B","rgb":{"r":0,"g":0,"b":139}},"midnightblue":{"hex":"191970","rgb":{"r":25,"g":25,"b":112}},"cornsilk":{"hex":"FFF8DC","rgb":{"r":255,"g":248,"b":220}},"blanchedalmond":{"hex":"FFEBCD","rgb":{"r":255,"g":235,"b":205}},"bisque":{"hex":"FFE4C4","rgb":{"r":255,"g":228,"b":196}},"navajowhite":{"hex":"FFDEAD","rgb":{"r":255,"g":222,"b":173}},"wheat":{"hex":"F5DEB3","rgb":{"r":245,"g":222,"b":179}},"burlywood":{"hex":"DEB887","rgb":{"r":222,"g":184,"b":135}},"tan":{"hex":"D2B48C","rgb":{"r":210,"g":180,"b":140}},"rosybrown":{"hex":"BC8F8F","rgb":{"r":188,"g":143,"b":143}},"sandybrown":{"hex":"F4A460","rgb":{"r":244,"g":164,"b":96}},"goldenrod":{"hex":"DAA520","rgb":{"r":218,"g":165,"b":32}},"darkgoldenrod":{"hex":"B8860B","rgb":{"r":184,"g":134,"b":11}},"peru":{"hex":"CD853F","rgb":{"r":205,"g":133,"b":63}},"chocolate":{"hex":"D2691E","rgb":{"r":210,"g":105,"b":30}},"saddlebrown":{"hex":"8B4513","rgb":{"r":139,"g":69,"b":19}},"sienna":{"hex":"A0522D","rgb":{"r":160,"g":82,"b":45}},"brown":{"hex":"A52A2A","rgb":{"r":165,"g":42,"b":42}},"snow":{"hex":"FFFAFA","rgb":{"r":255,"g":250,"b":250}},"honeydew":{"hex":"F0FFF0","rgb":{"r":240,"g":255,"b":240}},"mintcream":{"hex":"F5FFFA","rgb":{"r":245,"g":255,"b":250}},"azure":{"hex":"F0FFFF","rgb":{"r":240,"g":255,"b":255}},"aliceblue":{"hex":"F0F8FF","rgb":{"r":240,"g":248,"b":255}},"ghostwhite":{"hex":"F8F8FF","rgb":{"r":248,"g":248,"b":255}},"whitesmoke":{"hex":"F5F5F5","rgb":{"r":245,"g":245,"b":245}},"seashell":{"hex":"FFF5EE","rgb":{"r":255,"g":245,"b":238}},"beige":{"hex":"F5F5DC","rgb":{"r":245,"g":245,"b":220}},"oldlace":{"hex":"FDF5E6","rgb":{"r":253,"g":245,"b":230}},"floralwhite":{"hex":"FFFAF0","rgb":{"r":255,"g":250,"b":240}},"ivory":{"hex":"FFFFF0","rgb":{"r":255,"g":255,"b":240}},"antiquewhite":{"hex":"FAEBD7","rgb":{"r":250,"g":235,"b":215}},"linen":{"hex":"FAF0E6","rgb":{"r":250,"g":240,"b":230}},"lavenderblush":{"hex":"FFF0F5","rgb":{"r":255,"g":240,"b":245}},"mistyrose":{"hex":"FFE4E1","rgb":{"r":255,"g":228,"b":225}},"gainsboro":{"hex":"DCDCDC","rgb":{"r":220,"g":220,"b":220}},"lightgrey":{"hex":"D3D3D3","rgb":{"r":211,"g":211,"b":211}},"darkgray":{"hex":"A9A9A9","rgb":{"r":169,"g":169,"b":169}},"dimgray":{"hex":"696969","rgb":{"r":105,"g":105,"b":105}},"lightslategray":{"hex":"778899","rgb":{"r":119,"g":136,"b":153}},"slategray":{"hex":"708090","rgb":{"r":112,"g":128,"b":144}},"darkslategray":{"hex":"2F4F4F","rgb":{"r":47,"g":79,"b":79}}};


var dimValue = function(val, maxVal) {
	// thresholding
	// return Math.min(val, maxVal);

	// scaling
	var actualMax = 255;
	var factor = maxVal / actualMax;
	return Math.floor(val * factor);
};

/**
 * Returns a random integer in [min, max).
 */
var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};


var HtmlColors = {
	array: [],

	/** 
	 * Make sure, we get something that is not too bright, so it will be visible when on white background
	 */
	getDimmedHex: function(idx, maxVal) {
		maxVal = maxVal || 192;
		var color = this.array[idx];
		var r = dimValue(color.rgb.r, maxVal);
		var g = dimValue(color.rgb.g, maxVal);
		var b = dimValue(color.rgb.b, maxVal);
		var hex = rgbToHex(r, g, b);
		return hex;
	},

	getHex: function(idx) {
		var color = this.array[idx];
		return '#' + color.hex;
	},

	getRandomColorHex: function() {
	    var colorIdx = getRandomInt(0, this.array.length);
		return this.getDimmedHex(colorIdx);
	}
};

for (var colorName in colorObject) {
	var color = colorObject[colorName];
	color.name = colorName;
	HtmlColors.array.push(color);
}

module.exports = HtmlColors;