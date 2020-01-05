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


define([
	"dojo/_base/declare",
	"dijit/registry",
	"dijit/form/TextBox",
	"dijit/form/RadioButton",
	"dijit/form/DateTextBox",
	"dijit/form/NumberTextBox",
	"dijit/form/Textarea",
	"dijit/form/CheckBox",
	"dijit/form/Select",
	"dojo/dom",
	"dojo/dom-form",
	"dojo/_base/lang",
	"dojo/DeferredList",
	"dojo/_base/Deferred",
	"dijit/form/ValidationTextBox",
	"dijit/form/FilteringSelect",
	"dojo/promise/all"], 
	function(declare,Registry,TextBox,RadioButton,DateTextBox,NumberTextBox,Textarea,CheckBox,Select,dom,dom_form,lang,DeferredList,Deferred,ValidationTextBox,FilteringSelect,all){	
		//private functions
		var exclude = "submit|image|reset|button";

		

		function setValue(/*Object*/ obj, /*String*/ name, /*String*/ value){
		//Modified version of dojo/dom-form.js by Pere Joseph Rodriguez
		//Copyright (c) 2005-2016, The Dojo Foundation
		//All rights reserved.
        
		// summary:
        //		For the named property in object, set the value. If a value
        //		already exists and it is a string, convert the value to be an
        //		array of values.

        // Skip it if there is no value
        if(value === null){
            return;
        }

        var val = obj[name];
        if(typeof val == "string"){ // inline'd type check
            obj[name] = [val, value];
        }else if(lang.isArray(val)){
            val.push(value);
        }else{
            obj[name] = value;
        }
    }
		
		
		var fm={
				getDataURIByteString: function(dataURI){
					var byteString;
					if (dataURI.split(',')[0].indexOf('base64') >= 0) {
					  byteString = atob(dataURI.substring(dataURI.indexOf(',')+1));
					} else {
					  byteString = unescape(dataURI.split(',')[1]);
					}
					return byteString;
				}
				,getDataURIByteArray: function(dataURI){
					var ab, bs, ba, mimeString, _i, _len;
					bs=this.getDataURIByteString(dataURI);
					ab = new ArrayBuffer(bs.length);
					ba = new DataView(ab);
					_len = bs.length;
					for (_i = 0; _i < _len; _i++) {
						ba.setUint8(_i,bs.charCodeAt(_i));
					}
					return ba.buffer;
				}
				,getDataURIMimeType: function(dataURI){
					return dataURI.split(',')[0].split(':')[1].split(';')[0];
				}
				,getBlob: function(dataURI) {
					try{
						var ba=this.getDataURIByteArray(dataURI);
						var mimeString=this.getDataURIMimeType(dataURI);
						var blob= new Blob([ba],{type:mimeString});
						return blob;
					}catch(err){
						console.log(err);
						return null;
					}
				}
				
				,getBlobURL: function(blob) {
					try{
						var URL = window.URL || window.webkitURL;
						var downloadURL = URL.createObjectURL(blob);
						return downloadURL;
					}catch(err){
						console.log(err);
						return null;
					}
				}
			
				,jsonToForm: function (form, inputData, reset){
					var deferredError= new Deferred();
					var getinputData=function(_inputData,_key){
						if(_inputData[_key] instanceof Array){
							if(_inputData[_key].length>0){
								return _inputData[_key][arrayCounters[_key]++];
							}else{
								return null;
							}
						}else{
								return _inputData[_key];
						}
					};
					
					if(!inputData) {
						deferredError.reject(new Error("Can't fill form "+form.name+" without data"));
						return deferredError;
					}
					var arrayCounters={};
					for (var k in inputData){
						if(inputData[k] instanceof Array){
							arrayCounters[k]=0;
						}					//form reset
					}
					try{
						for(var i = 0; i < form.domNode.elements.length; i++){
							var elem = Registry.getEnclosingWidget(form.domNode.elements[i]);
							if(elem==null) continue;
							//if(elem.get('value')) elem.set('value',''); //afecta al filteringselect combinado
							if(form.domNode.elements[i].type=='file' ){
								if(form.domNode.elements[i].files && form.domNode.elements[i].files.length>0) 
									form.domNode.elements[i].type='text';
									form.domNode.elements[i].type='file';
							}
						}
						
						//form fulfill
						var outPromises=new Array();
						var s = "";
						for(var i = 0; i < form.domNode.elements.length; i++){
							
							var key=form.domNode.elements[i].name;
							var elem = Registry.getEnclosingWidget(form.domNode.elements[i]);
							if(elem==null) continue;

							//en orden de subclase a superclase, primero las subclases
							if(elem.name==key && elem instanceof DateTextBox){
									var data=getinputData(inputData,key);
									if(!(data==null)){
										elem.set('value',new Date(data));
									}else{
										if(reset) elem.set('value',null);
									}
							} else if(elem.name==key && elem instanceof FilteringSelect ){
								//creamos un deferred ya que es as?ncrono
								var p=new Deferred();
								outPromises.push(p);
								var data=getinputData(inputData,key);
									
								if(!(data==null)){ // si llega valor de la petici?n
									var tempEl = elem;
									var data2=data;
									//preparamos la invocaci?n para buscar el item del select con el id recibido en la petici?n
									//para seleccionar un elemento del select es necesario el item, no se puede hacer con el id
									//var item=(elem.store.get)?elem.store.fetchItemByIdentity({identity:data2}):elem.store.get(data2);
									
									var createQuery=function (dataId, selectElement, retryCounter,def){
										return {
											query:      {'id':dataId}, //id del item a buscar
											onComplete: function(item){ //funci?n de callback una vez encontrado el elemento (o no)
												if (item.length == 0 ){ //si no encontramos el elemento
													selectElement.disabled = false;
													selectElement.set('item',null,false);
												}else{
													//si encuentra el elemento en la lista, lo asigna
													selectElement.disabled = false;
													
													//el ItemFileReadStore devuelve items diferentes al service store, y para que funcione
													//necesitamos pasar el label al set('item'), o lo ir? a pedir al service store v?a getValue
													//?ste devolver? un label de tipo array, y el textbox no lo sabr? interpretar por ser un array y no un string y mostrar? el id en vez del label.
													selectElement.set('item',null,false);
													if(Array.isArray(item[0][selectElement.searchAttr]))
														selectElement.set('item', item[0],true,item[0][selectElement.searchAttr][0]);		
													else
														selectElement.set('item', item[0],true,item[0]);		
													def.resolve();
												}
																							
											},
											onError:    function(error){
													def.reject(error);
												}
										}
									};
									query1=createQuery(data2,tempEl,1,p);
									
									tempEl.store.fetch(query1,false);
								}else{
									if(reset) elem.reset();
									p.resolve();
									
								}
																	
							}else if(elem.name==key && ( elem instanceof NumberTextBox || elem instanceof Textarea ||  elem instanceof TextBox ||  elem instanceof ValidationTextBox )  ){
									var data=getinputData(inputData,key);
									if(!elem.type || elem.type!="file"){
										if(!(data==null)){
											elem.set('value',data);
										}else{
											if(reset) elem.reset();
														
										}
									}else{
										//var blob = new Blob([data[key].data], { type: 'application/pdf' });
									}
								
							}
		
		
		
							if(elem.name==key && elem instanceof RadioButton){
									var data=getinputData(inputData,key);
									if(!(data==null)){
										if(elem.value==""+data){
											elem.set('checked',true);
										}else{
											if(reset) elem.reset();
											
										}
									}
								
							}else if(elem.name==key && elem instanceof CheckBox ){
								var data=getinputData(inputData,key);
								if(!(data==null)){
									elem.set('checked',data);
								}else{
									if(reset) elem.reset();
									
								}
							}else if(elem.name==key && elem instanceof Select ){
								var data=getinputData(inputData,key);
								if(!(data==null)){
									elem.set('value',''+data);
								}else{
									if(reset) elem.reset();
									
								}
												
							}
							
							// return a single promise that waits for the execution of all its contained promises
							
						}
						
						return all(outPromises);
						
					}catch(error){
						deferredError.reject(error);
						return deferredError.promise;
					}
					
				}
				

				,_formToJsonWithFilesAsDataUriExtended: function(formNode,callback, asArrayResult){
					//Modified version of dojo/dom-form.js by Pere Joseph Rodriguez
					//Copyright (c) 2005-2016, The Dojo Foundation
					//All rights reserved.
					
					
					// summary:
					//		Serialize a form node to a JavaScript object.
					// description:
					//		Returns the values encoded in an HTML form as
					//		string properties in an object which it then returns. Disabled form
					//		elements, buttons, and other non-value form elements are skipped.
					//		Multi-select elements are returned as an array of string values.
					// formNode: DOMNode|String
					// example:
					//		This form:
					//		|	<form id="test_form">
					//		|		<input type="text" name="blah" value="blah">
					//		|		<input type="text" name="no_value" value="blah" disabled>
					//		|		<input type="button" name="no_value2" value="blah">
					//		|		<select type="select" multiple name="multi" size="5">
					//		|			<option value="blah">blah</option>
					//		|			<option value="thud" selected>thud</option>
					//		|			<option value="thonk" selected>thonk</option>
					//		|		</select>
					//		|	</form>
					//
					//		yields this object structure as the result of a call to
					//		formToObject():
					//
					//		|	{
					//		|		blah: "blah",
					//		|		multi: [
					//		|			"thud",
					//		|			"thonk"
					//		|		]
					//		|	};
			
					var ret = {}, elems = dom.byId(formNode).elements;
					
					//preparamos la llamada al callback en el contexto de window
					var callArgs=new Array();
					for(var i=2;i<arguments.length;i++) callArgs.push(arguments[i]);
					
					//Preparamos un defered list para llamar al callback cuando todos los campos hayan sido cargados
					var dl_arr=new Array();
					for(var i = 0, l = elems.length; i < l; ++i){
						var d=new Deferred();
						dl_arr.push(d);
					}
					var  dl= new DeferredList(dl_arr,false,false,true);
					var rret=dl.then(function(result){
						var r=new Array();
						if(asArrayResult){
							var r2=new Array();
							r2.push(ret);
							r.push(r2);
						}else{
							r.push(ret);
							
							
						}
						for(var i=0;i<callArgs.length;i++) r.push(callArgs[i]);
						if(callback){
							return callback.apply(window,r);
						}else{
							return r;
						}
					});
					try{
						//cargamos los valores
						var fileCounter=0;
						for(var i = 0, l = elems.length; i < l; ++i){
							var item = elems[i], _in = item.name, type = (item.type || "").toLowerCase();
							if(_in && type && exclude.indexOf(type) < 0 && !item.disabled){
								if(_in && type=="file" && !item.disabled){
									var reader = new FileReader();
									var callContext=new function (){
										 this.processedFileCounter=0;
										 this.files=item.files;
										 this._in=_in;
										 this.i=i;
										 this.fileCounter=fileCounter;
										 this.reader=reader;
										 
										 this.callback = function(e){
											if(this.filesLength>1){
												ret[this._in].push("data:"+this.files[this.fileCounter].type+";base64,"+btoa(this.reader.result));
											}else{
												ret[this._in]="data:"+this.files[this.fileCounter].type+";base64,"+btoa(this.reader.result);
											}
											this.processedFileCounter++;
											if(this.processedFileCounter==this.files.length){
												dl_arr[this.i].resolve();	
											}
										};
										return this;
									};
									fileCounter++;
									var callWithParams=dojo.hitch(callContext, callContext.callback);
									reader.onload = callWithParams
									
									
									if(item.files.length>0){
										ret[_in]=new Array();
									}else{
										dl_arr[i].resolve();
									}
									for(var j=0;j<item.files.length;j++){
										var f=reader.readAsBinaryString(item.files[j]);
									}
								}else{
									var val=dom_form.fieldToObject(item);
									if((type == "radio" || type == "checkbox") && val==null){
										val="false"; //Los checkbox son true/false, no permitimos null
									}
									if(val!="")
										setValue(ret, _in, val);
									if(type == "image"){
										ret[_in + ".x"] = ret[_in + ".y"] = ret[_in].x = ret[_in].y = 0;
									}
									dl_arr[i].resolve();
								}
							}else{
								dl_arr[i].resolve();
							}
							
						}
					}catch(error){
						rret.reject(error);
					}
					return rret;
					
				}
				,formToJsonWithFilesAsDataUri: function(formNode,callback){
					return this._formToJsonWithFilesAsDataUriExtended(formNode, callback, false);
				}
				,formToJsonArrayWithFilesAsDataUri: function(formNode,callback){
					return this._formToJsonWithFilesAsDataUriExtended(formNode, callback, true);
				}	
				
				,isValid: function (formId){
					return dijit.byId(formId).validate();
				}
				
				,recursiveFillTemplate:function(content,templateElem,targetElem,results,row){
						for(var i = 0; i < content.children.length; i++){
								if(results[row][content.children[i].id]){
									if(content.children[i].src){
										if(results[row][content.children[i].id]!=null)
											content.children[i].src=this.getBlobURL(this.getBlob(results[row][content.children[i].id]));
									}else if(content.children[i].data){
										if(results[row][content.children[i].id]!=null){
											content.children[i].data=this.getBlobURL(this.getBlob(results[row][content.children[i].id]));
											content.children[i].type=this.getDataURIMimeType(results[row][content.children[i].id]);
										}
									}else if(content.children[i].href){
										if(results[row][content.children[i].id]!=null)
											content.children[i].src=this.getBlobURL(this.getBlob(results[row][content.children[i].id]));
									}else if(content.children[i].getAttribute("data-dojo-type")){
										var propsAttr=content.children[i].getAttribute("data-dojo-props");
										if(!propsAttr) propsAttr="{}";
										var props=require("dojo/json").parse(propsAttr);
										props.value=results[row][content.children[i].id];
										propsAttr=require("dojo/json").stringify(props);
										content.children[i].setAttribute("data-dojo-props",propsAttr.substring(1,propsAttr.length-1));
										
									}else{
										content.children[i].innerHTML=results[row][content.children[i].id];
									}
									content.children[i].id=targetElem.id+"_"+content.children[i].id+"_"+row;
								}else{
									if(content.children[i].nodeType!=3)
										content.children[i].id=targetElem.id+"_"+content.children[i].id+"_"+row;
									
									if(content.children[i].children && content.children[i].children.length>0){
										
										this.recursiveFillTemplate(content.children[i],templateElem,targetElem,results,row);
										
									}
								}
							}
					}	
				,templateToJson: function(rowElement){
					var obj={};
					this.recursiveTemplateToJson(rowElement,obj);
					return obj;
					
				}
				,recursiveTemplateToJson: function(rowElement,obj){
					
					for(var childCounter=rowElement.childNodes.length-1;childCounter>=0;childCounter--){
						if(rowElement.childNodes[childCounter].nodeType!=3){
							if(rowElement.childNodes[childCounter].id){
								var s=rowElement.childNodes[childCounter].id.split('_');
								var formName=s[0];
								var fieldName=s[2];
								var rowNum=s[3];
								if(formName!="" && fieldName!="" && rowNum!=""){
									obj[fieldName]=rowElement.childNodes[childCounter].innerHTML;
								}else{
									this.recursiveTemplateToJson(rowElement.childNodes[childCounter],obj);
								}
								
							}
						}
					}
					
				}
				,jsonToTemplate: function(templateElem,targetElem,results){
					//reset content
					var widgets = dijit.findWidgets(targetElem);
					dojo.forEach(widgets, function(w) {
						w.destroyRecursive(true);
					});
					for(var childCounter=targetElem.childNodes.length-1;childCounter>=0;childCounter--){
						if(targetElem.childNodes[childCounter].nodeName.toLowerCase()!="template")
							targetElem.removeChild(targetElem.childNodes[childCounter]);
					}
					
					for(var row=0;row<results.length;row++){
						//fill template
						var clone = document.importNode(templateElem.content, true);
						this.recursiveFillTemplate(clone,templateElem,targetElem,results,row);
						targetElem.appendChild(clone);
						
					}
					//Returns a blended object that is an array of the instantiated objects, but also can include a promise that is resolved with the instantiated objects. This is done for backwards compatibility. If the parser auto-requires modules, it will always behave in a promise fashion and parser.parse().then(function(instances){...}) should be used.
					return require("dojo/parser").parse(targetElem);
				}
				
				,setLastSelectedRows: function(tableId){
					var registry=require(["dijit/registry"]);	
					var grid=dijit.byId(tableId);
					if(grid.select.row.getSelected().length<1){
					}else{
						var ids=grid.select.row.getSelected() //Array of selected Ids
						
						var selectedIdsString="";
						for(var i=0;i<ids.length;i++){
							var id=ids[i];
							if(i>0)selectedIdsString+="|"
							selectedIdsString+=""+ids[i];
						}
						if(selectedIdsString!=""){
							document.getElementById(tableId+"_selectedIds").value=selectedIdsString;
							document.getElementById(tableId+"_selectedIds_lastUpdate").value=new Date().getTime();
						}
					}
				}
				,getLastSupplierName(tableIdArrayOrString){
					var suppliers=new Array();
					if(tableIdArrayOrString instanceof Array){
						suppliers=tableIdArrayOrString;
					}else{
						suppliers.push(tableIdArrayOrString);
					}
					var supplierName=suppliers[0];
					var lastUpdated=0;
					if(suppliers.length>1){
						//check last used
						for(var s=0;s<suppliers.length;s++){
							var updateTime=document.getElementById(suppliers[s]+"_selectedIds_lastUpdate").value;
							if(updateTime>lastUpdated){
								lastUpdated=updateTime;
								supplierName=suppliers[s];
							}
						}
					}
					return supplierName;
				}
				,getLastSelectedRows: function(tableIdArrayOrString){
					var supplierName=this.getLastSupplierName(tableIdArrayOrString);
					var tempGrid=dijit.byId(supplierName);
					if(supplierName==""){
						if(window.I18n){
							throw new Error("$i18n.mustSelectIte$");
						}else{
							throw new Error("Debe seleccionar algún registro.");
						}
					}
					
					var tempGrid=dijit.byId(supplierName);
					var ids=document.getElementById(supplierName+"_selectedIds").value.split("|");
			
					if(ids==""){
						if(window.I18n){
							throw new Error("$i18n.mustSelectItem$");
						}else{
							throw new Error("Debe seleccionar algún registro.");
						}
						return;
					}else{
						var items=ids.map((id)=>{return tempGrid.model.store._itemsByIdentity[id]});
						return items;
					}
					
				},
				getItemSingleValue : function(item){
					if(item instanceof Array){
						return item[0];
					}else{
						return item;
					}
				}
		
	};
	function a(){
		for (var key in fm){
				//var attrName = key;
				//var attrValue = obj[key];
				this[key]=fm[key];
		}
		return this;
	};
	return new a();
});
