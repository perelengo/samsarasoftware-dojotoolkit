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
//sobreescribimos el m?todo deserialize para poder gestionar mejor los errores.



define('samsarasoftware/layout/ErrorHandler',
['dojo/_base/declare',
'dijit/_Widget',
'dijit/_Templated',
'dojo/text!./ErrorHandler.html',
'dijit/dijit',
'dijit/Dialog',
'dijit/layout/ContentPane',
'dijit/TitlePane',
'dijit/form/Button',
'samsarasoftware/i18n/I18n'
],function(declare,_Widget,_Templated,templateString,I18n){

	 return declare('samsarasoftware/layout/ErrorHandler',[ _Widget, _Templated], {
		   widgetsInTemplate:true,
		   templateString:templateString
		   ,_serverTrace:null
		   ,_clientTrace:null
		   ,_description:null
		   ,_dialog:null
		   ,_retryButton:null
		   ,_retryFunc:null
		   ,_retrySuccessCallback:null
		   ,_retryErrorCallback:null
		   ,_retryFuncContext:null
		   
		   ,constructor:function(params, srcNodeRef){
				
			}
			,setI18n(i18n){
				this.i18n=i18n;
			}
		   ,show:function(description,retryFunc,successCallback,errorCallback,retryFunctionContext){
				var descr,server,client;
				if(retryFunc){
					this._retryFunc=retryFunc;
					this._retrySuccessCallback=successCallback;
					this._retryErrorCallback=errorCallback;
					this._retryFuncContext=(retryFunctionContext)?retryFunctionContext:window;
					this._retryButton.domNode.style.display="inline";
				}
				
				if(description instanceof Error){
					if(description._rpcErrorObject){
						if(this.i18n)
							descr=this.i18n.translate(description._rpcErrorObject.code+": "+description._rpcErrorObject.message);
						else
							if(description._rpcErrorObject)
								descr=description._rpcErrorObject.code+": "+description._rpcErrorObject.message;
							else
								descr=description.text;
						
						server=description._rpcErrorObject.data;
						client=description.stack;
					}else if(description._httpResponseObject){
						if(this.i18n)
							descr=this.i18n.translate(description._httpResponseObject.code+": "+description._httpResponseObject.message);
						else
							if(description._httpResponseObject)
								descr=description._httpResponseObject.code+": "+description._httpResponseObject.message;
							else
								descr=description.text;
						server=description._httpResponseObject.data;
						client=description.stack;						
					}else{
						if(this.i18n)
							descr=this.i18n.translate(description.message);
						else
							descr=description.message;
						client=description.stack;	
					}
				}
				
				//descr=description;
				this._hora.innerHTML=new Date().toString();
				if(descr)
					this._description.innerHTML=(""+descr).replace(/\n/g,"<br/>");
				if(server){
					this._serverTrace.set("content",""+decodeURIComponent(server.replace(/\+/g,"%20")).replace(/\n/g,"<br/>"));
				}
				if(client){
					this._clientTrace.set("content",""+client.replace(/\n/g,"<br/>"));
				}
				this._dialog.show();

		   }
		   ,hide(){
			   this._dialog.hide();
		   }
		   ,onClose:function(e){
			   this.inherited(args);
			   this.destroy();
		   }
		   ,retry:function(){
			   this._retryFunc.call(this._retryFuncContext,this._retrySuccessCallback,this._retryErrorCallback,this._retryFunc);
			   this.hide();
		   }
		   
	});
});
