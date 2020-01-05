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
 
 var __locale="";

{
	var langName = "locale=";
	var ca = document.cookie.split(';');
	for(var i=0; i<ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ')
			c = c.substring(1);
		if (c.indexOf(langName) == 0){
			__locale=c.substring(langName.length, c.length).replace("_","-");
			require({locale:__locale});
		}
	}
	if(__locale==""){
		__locale="es-es";
		require({locale:__locale});
	}
}

 define(["dojo/_base/declare", "dojo/ready", "dojo/cookie","dojo/_base/xhr","dojo/parser","dojo/_base/config","dojo/_base/Deferred","dojo/_base/lang","dojo/promise/all"],
	function(declare, ready,Cookie,xhr,parser,config,Deferred,lang,All){
        return declare("samsarasoftware/i18n/I18n",[],  function(){
			
			var self;
			return {
				i18n:{}
				,constructor: function(params){
					self=this;
					
					
					if(params)
						self.getData(params,{}).then(
							function(data){
								  self.i18n=lang.mixin(data,self.i18n)
							});
				}
				,translate:function(text){
					return text.replace(/\$([^\s\:\$]*)(?:\:([^\s\:\$]+))?\$/g,
						(occurrence,key,unk)=>{
							if(key==""){
							return occurrence;
							}
						var res= dojo.getObject(key, false, this);
						if(res!=null){
							return res;
						}else{
							return occurrence;
						}
					});
				}
				
				,getData:function(url){
					var d=new Deferred();
					var defCall=function(_self){
						this.self=_self;
						this.resolveDef=function(data){
							if(!(data instanceof Error) && data.trim()!=""){
								
								var t=JSON.parse(data);
								var output=JSON.parse(data);
								output=lang.mixin(self.i18n,output);
								
								if(t["i18n:import"]){
									var outArr=new Array();
									var i=0;
									for(i=0;i<t["i18n:import"].length;i++){
										delete output["i18n:import"];
										outArr.push(self.getData(t["i18n:import"][i],output));
									}
									var j=0;
									var _a=All(outArr);
									_a.then(function a(){
										for(j=0;j<outArr.length;j++){
											if(outArr[j].results[0] && !(outArr[j].results[0] instanceof Error)){
												lang.mixin(output,outArr[j].results[0]);
											}
										}
									});
								}
								d.resolve(output);
							}else{
								d.resolve(data);
							}
						};
					};
					xhr.get({
						url:url,
						sync:true,
						load:new defCall(self).resolveDef,
						error:new defCall(self).resolveDef
					})	;
					
					return d;
					
				}
			}
		}());
	}
);


