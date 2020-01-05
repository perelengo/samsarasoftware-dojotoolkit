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


define(['dojo/_base/lang',"dojo/_base/declare","dojox/data/ServiceStore",'dojox/rpc/Service','dojo/data/ItemFileReadStore','dojo/Deferred'],

	function(lang,declare,serviceStore,Service,ItemFileReadStore,Deferred){	
		
			return declare("samsarasoftware/data/WSDL2ServiceStore", [serviceStore], function(){
				
				return {
					memory:null,
					idAttribute:"id",
					_retries:0,
					retries:0,
					
					constructor: function(params, srcNodeRef){
						this.idAttribute="id";
						this.srcNodeRef=(srcNodeRef)?srcNodeRef:{}; //por si no es declarative
						this.srcNodeRef.memory=null;
						this.endpoint=null;
						this.widget=this;
						lang.mixin(srcNodeRef, this);
					},
					cleanQuery: function(query){
						if(dojo.isArray(query)){
							for(i in query){
								for(k in query[i]){
									if(query[i][k]===undefined || query[i][k]=="") delete query[i][k];
								}
							}
						}else{
							for(k in query){
								if(query[k]===undefined|| query[k]=="") delete query[k];
							}
						}
					},
					fetch: function(request,initialize){
						var onError=function(error,req){
							this.srcNodeRef.memory=null;
							if(request.oldRequest && request.oldRequest.onError)
								request.oldRequest.onError(error,request.oldRequest);							
						
						};						
						
						if(this.srcNodeRef.memory==null){
								this.srcNodeRef.memory=new require("dojo/data/ItemFileReadStore")({identifier:this.idAttribute,items:{}});
								var onComplete=function (items, request) {
										if(items.length>0 && !this.isItem(items[0])){
											this.srcNodeRef.memory=null;
											if(this._retries>0){
												this._retries--;
												this.fetch(request.oldRequest);
												return;
											}else{
												if(request.oldRequest)
													request.oldRequest.onError(items,request.oldRequest);
											}
										}else{
											this.srcNodeRef.memory.clearOnClose=true;
											this.srcNodeRef.memory.data={identifier:this.idAttribute,items:items};
											this.srcNodeRef.memory.close();
											this._retries=this.retries;

											if(request.oldRequest){
												if(dojo.isArray(request.oldRequest.query)){
														var r={}; 
														var initializeRequest1={
															query:request.oldRequest.query[0]
															,onComplete:request.oldRequest.onComplete
															,onError:request.oldRequest.onError
															};
														r=lang.mixin(r,request.oldRequest);
														var initializeRequest2=lang.mixin(r,initializeRequest1);
														//elimina las queries con atributos undefined
														this.widget.cleanQuery(initializeRequest2.query);

														this.srcNodeRef.memory.fetch(initializeRequest2);
												}else{
													//elimina las queries con atributos undefined
													this.widget.cleanQuery(request.oldRequest.query);
													this.srcNodeRef.memory.fetch(request.oldRequest);
												}
												
											}
										}
								};

								if(initialize==undefined || (initialize!=undefined && initialize)){
									//El ItemFileReadStore funciona con un objeto query, pero los servicios JsonRPC que tenemos funcionan con un array de objetos.
									var method=this.widget.endpoint.binding.operations[this.widget.operationName];
									this.service=function(req){
										var d=new Deferred();
										
										d.addCallback=function(f){
											d.__okCallback=f;
											d.then(
												function (res){
													d.__okCallback(res.data)
												}
												,function (res){
												
												});
										}
										d.addErrback=function(f){
											d.__errCallback=f;
											d.then(
												function (res){
												
												}
												,function (res){
													d.__errCallback(res)
												});
										}
										this.widget.endpoint.stub[this.widget.operationName](req).then(
											function (res){
												d.resolve(res);}
											,function (err){
												d.cancel(err);}
										);
										return d;
									}
									if(method.messages["wsdl:input"][0].type.children[0].localName.toLowerCase()=="sequence" && !dojo.isArray(request.query)){
										var r={}; 
										var initializeRequest1={
											query:[request.query]
											,oldRequest:request
											,onComplete:onComplete
											,onError:onError
											};
										r=lang.mixin(r,request);
										var initializeRequest2=lang.mixin(r,initializeRequest1);
										arguments[0]=initializeRequest2;
										return this.inherited(arguments);
									}else{
										var r={}; 
										var initializeRequest1={
											query:request.query
											,oldRequest:request
											,onComplete:onComplete
											,onError:onError
											};
										r=lang.mixin(r,request);
										var initializeRequest2=lang.mixin(r,initializeRequest1);
										arguments[0]=initializeRequest2;
										return this.inherited(arguments);
									}
								}else{
									if(!this.srcNodeRef.memory.data){
										request.onComplete([],request);
										return;
									}else{
										//elimina las queries con atributos undefined
										this.widget.cleanQuery(request.query);

										return this.srcNodeRef.memory.fetch(request);
									}
								}
						}else{
							if(this.srcNodeRef.memory._arrayOfAllItems.length==0){
								 request.onComplete([],request);
								 return;
							}
							if(dojo.isArray(request.query)){
								var r={}; 
								var initializeRequest1={
									query:request.query[0]
									,onComplete:request.onComplete
									,onError:request.onError
									};
								r=lang.mixin(r,request);
								var initializeRequest2=lang.mixin(r,initializeRequest1);
								//elimina las queries con atributos undefined
								this.widget.cleanQuery(initializeRequest1.query);

								return this.srcNodeRef.memory.fetch(initializeRequest2);
							}else{
								//elimina las queries con atributos undefined
								this.widget.cleanQuery(request.query);

								var r= this.srcNodeRef.memory.fetch(request);
								return r;
							}
							
						}
					},
					reset:function(){
						this.srcNodeRef.memory=null;
					}
					
	
	
				};
			}());

});
