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
define("samsarasoftware/form/RichFilteringSelect", [
	"dojo/_base/declare", 
	"dojo/_base/lang", 
	"dojo/when",
	"dijit/form/FilteringSelect",
	"./RichDataList",
	"dojo/Deferred",
	"dijit/registry"
], function(declare, lang, when,FilteringSelect, RichDataList,Deferred,Registry){

	
	
	return declare("samsarasoftware/form/RichFilteringSelect", [FilteringSelect], {
		dependsOn:null
		,dependsOnSearchAttribute:null
		,_deferredTask:null
		,_deferredTaskList:new Array()
		,store:null
		,_oldFetch:null
		,_dependentOldFetch:null
		,postMixInProperties: function(){

			this.dependsOn=(this.params.dependsOn)?dijit.byId(this.params.dependsOn.id):null;
			this.dependsOnSearchAttribute=this.params.dependsOnSearchAttribute;
			
			//creamos el store antes, para sobreescribir la l?gica del filteringSelect
			var store = this.params.store || this.store;
			if(store){
				this._setStoreAttr(store);
			}else{
				this.store=new RichDataList(this.params,this.srcNodeRef);
			}

			
			this.inherited(arguments);
			
			if(this.dependsOn && this.dependsOn instanceof FilteringSelect){
				this.dependentStore=this.dependsOn.store;
				this._dependentOldFetch=this.dependentStore.fetch;
				if(!this.store._oldFetch) this.store._oldFetch=this.store.fetch;
				this._oldFetch=this.store._oldFetch;
				
				
				
				
				this.dependentStore.fetch=dojo.hitch(this,function(request){
					this.store._deferredTask=new Deferred();
					
					var onError=function(error,req){
						if(request.oldRequest && request.oldRequest.onError){
							request.oldRequest.onError(error,request.oldRequest);
						}else if(request.onError){
							request.onError(error,request);
						}
						
					};
					var onComplete=function (items, request) {
						request.oldRequest.onComplete(items,request.oldRequest);
						//self.set("displayedValue","");
						var identifier=(this.dependsOnSearchAttribute)?this.dependsOnSearchAttribute:"name";
						var q={};
						q.query={};
						q.query[identifier]=this.dependsOn.get('value');
						q.onComplete=dojo.hitch(this,function(items, request){
								this.store._deferredTask.resolve(items,request);
								this.store._deferredTask=null;
							});
						
						this.store.reset();
						this._oldFetch.call(this.store,q);
						
					};
					var r={}; 
					var initializeRequest1={
						query:request.query
						,oldRequest:request
						,onComplete:lang.hitch(this, onComplete)
						,onError:lang.hitch(this, onError)
						};
					r=lang.mixin(r,request);
					var initializeRequest2=lang.mixin(r,initializeRequest1);
					return this._dependentOldFetch.call(this.dependentStore,initializeRequest2);
				
				});
				
			
				
				this.store.fetch=dojo.hitch(this,function(args){
					
					//this is store
					if(this.store._deferredTask){
						this._deferredTaskList.push(args);
						this.store._deferredTask.then(dojo.hitch(this,
								function def(args2){
									var i=0;
									for(i=0;i<this._deferredTaskList.length;i++)
										this._oldFetch.call(this.store,this._deferredTaskList.shift());
								}
							));
					}else{
							//this.reset();
							var args2=lang.mixin({},args);
							var identifier=(this.dependsOnSearchAttribute)?this.dependsOnSearchAttribute:"id";
							args2.query[identifier]=this.dependsOn.get('value');
							this._oldFetch.call(this.store,args2);
						
					}
				
				});
			}
		}
		
	});
});
