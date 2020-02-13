/*-
 * #%L
 * samsarasoftware-dojotoolkit
 * %%
 * Copyright (C) 2014 - 2020 Pere Joseph Rodriguez
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
define('samsarasoftware/rpc/JsonRpc2EnvelopeHandler',
['dojo/_base/declare',
'dojo/errors/RequestError',
'dojo/Deferred',
'dojo/promise/Promise'
],function(declare,RequestError, Deferred, DojoPromise){

	 return declare('samsarasoftware/rpc/JsonRpc2EnvelopeHandler',null, {
		   constructor:function(args){
				declare.safeMixin(this, args);
			},
			
			serialize: function(smd, method, data, options){
					//not converted to json it self. This  will be done, if
					//appropriate, at the transport level
		
					var d = {
						id: this._requestId++,
						method: method.name,
						params: data
					};
					d.jsonrpc = "2.0";
					return {
						data: dojo.toJson(d),
						headers:{"Content-type":'application/json'},
						handleAs: "ws",
						transport:"POST"
					};
			},
			defaultDeserialize(response,method, endpoint){
				var responseContentType=response.getHeader("content-type") ||response.getHeader("Content-Type") ||response.options.headers["Content-type"] ||response.options.headers["content-type"]  ;
				var simplifiedContentType=(responseContentType.indexOf(";")==-1)?responseContentType.trim():responseContentType.substring(0,responseContentType.indexOf(";")).trim();
				
				if(endpoint._options.deserializerRegistry){
					var mixin1={data:endpoint._options.deserializerRegistry.match(simplifiedContentType).deserialize(responseContentType, response.text)};
					return dojo.mixin(dojo.mixin({},response),mixin1)
				}else{
					
					var rpcResponse=samsarasoftware.jsonrpc.deserializerRegistry.match(simplifiedContentType).deserialize(responseContentType, response.text);
					if(rpcResponse.error){
						var err=new Error(rpcResponse.error.message);
						err._rpcErrorObject=rpcResponse.error;
						err._httpResponse=response;
						throw err;
					}
					var mixin1={data:rpcResponse.result};
					return dojo.mixin(dojo.mixin({},response),mixin1)
				}
			},
			handleLogin(response,method, endpoint){
				var lhClass=dojo.config["loginHandler"];
						
				var lh=require(lhClass);
				if(lh instanceof Function){
					lh=new lh(response);
				}
				obj=lh.show(response.text);
				if(obj instanceof Promise || obj instanceof DojoPromise){
					var d=new Deferred();
					obj.then(function a(data){
						try{
							var r=this.defaultDeserialize(data);
							if(r instanceof Error){
								lh.hide();
								d.reject(r);	
							}
							else if(r instanceof Promise || r instanceof Deferred || obj instanceof DojoPromise){
								r.then(function(data2){
									lh.hide();
									d.resolve(data2);
								},function(data2){
									lh.hide();
									d.reject(data2);
								});
							}else{
								lh.hide();
								d.resolve(r);
							} 
						}catch(err){
							lh.hide();
							d.reject(err);
						}
					},function(err){
						d.reject(err);
					});
					
					return d;
				}else{
					return obj;
				} 
			},
			
			deserialize:function(res){
				var response=res[2];
				var method=res[0];
				var endpoint=res[1];

				
				if(response.status==403){
					return this.handleLogin(response,method, endpoint);
				}else{
					return this.defaultDeserialize(response,method, endpoint);
				}
			},
	});
 });

require(["dojo/_base/lang","dojox/rpc/Service","dojo/errors/RequestError","dojo/Deferred","samsarasoftware/rpc/JsonRpc2EnvelopeHandler"], function(lang,service,RequestError,Deferred,JsonRpc2EnvelopeHandler){

	{
	//Dynamic pre-loading of login handler class
	var lhClass=dojo.config["loginHandler"];
	require([lhClass],function (lh){});
	}
	
	dojox.rpc.envelopeRegistry.unregister("JSON-RPC-2.0");
		
	dojox.rpc.envelopeRegistry.register(
		"JSON-RPC-2.0",
		function(str){ return str == "JSON-RPC-2.0"; },
		new JsonRpc2EnvelopeHandler()
	);		
	if(!samsarasoftware)
		samsarasoftware={};
	if(!samsarasoftware.jsonrpc)
		samsarasoftware.jsonrpc={};
	if(!samsarasoftware.jsonrpc.deserializerRegistry)
		samsarasoftware.jsonrpc.deserializerRegistry = new dojo.AdapterRegistry(true);

	samsarasoftware.jsonrpc.deserializerRegistry.register(
		"application/json",
		function(str){ return str == "application/json"; },
		{
			deserialize: function(contentType,data){
				try{
					return JSON.parse(data);
				}catch(e){
					throw e;
				}
			}
		}
	);
});	
