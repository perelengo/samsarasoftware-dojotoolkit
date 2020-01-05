/*-
 * #%L
 * samsarasoftware-dojotoolkit
 * %%
 * Copyright (C) 2014 - 2017 Pere Joseph Rodriguez
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 * #L%
 */
define("samsarasoftware/form/RichDataList", [
	"dojo/_base/declare", 
	"dojo/dom", 
	"dojo/_base/lang", 
	"dojo/query", 
	"dojo/store/Memory",
	"dijit/registry",
	"dojo/_base/kernel"
], function(declare, dom, lang, query, MemoryStore, registry,kernel){

	function toItem(/*DOMNode*/ node){
			if(node.getAttribute("data-" + kernel._scopeName + "-type") || node.getAttribute("type") === "separator"){
				return { id:"", value: "", label: ""};
			}
			var r= {
				id: (node.getAttribute("data-" + kernel._scopeName + "-value") || node.getAttribute("value")),
				value: (node.getAttribute("data-" + kernel._scopeName + "-value") || node.getAttribute("value")),
				name: String(this.searchAttr || node.innerText),
				label: String(this.labelAttr || node.innerHTML),
			};
			return r;
	}
	
	return declare("samsarasoftware.form.RichDataList", MemoryStore, {
		constructor: function(params, srcNodeRef){
			this.domNode = srcNodeRef;

			lang.mixin(this, params);
			if(this.id){
				this.id+="-store;"
				registry.add(this);
			}
			this.domNode.style.display = "none";

			this.inherited(arguments, [{
				data: query("> *", this.domNode).map(toItem)
			}]);
		},

		destroy: function(){
			registry.remove(this.id);
		},

	});
	
	


});
