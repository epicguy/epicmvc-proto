var E= require( './EpicCore');
E.opts( {key: 'SomeOption'});
E.opts( {key2: 'SomeOption2'});
E.opts( {key: 'SomeOtherOption'});
console.log( 'E', E);
console.log( 'E.*', (function(){
	var nms= [];
	for( var nm in E) { nms.push( nm); }
	return nms.join();
})());

console.log( 'E.option', E.option);
