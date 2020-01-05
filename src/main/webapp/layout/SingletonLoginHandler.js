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
var lh=null;

define('samsarasoftware/layout/SingletonLoginHandler',
['dojo/_base/declare',
'dijit/_Widget',
'dijit/_Templated',
'dojo/text!./LoginHandler.html',
'dojox/data/ServiceStore',
'dijit/dijit',
'dijit/Dialog',
'dijit/layout/ContentPane',
'dijit/TitlePane',
'dijit/form/Button'
,'samsarasoftware/rpc/JsonRpc2EnvelopeHandler'

],function(declare,_Widget,_Templated,templateString,serviceStore){
	

	 if(lh==null){
		lh=new declare('samsarasoftware/layout/SingletonLoginHandler',[ _Widget, _Templated], {
		   
		   widgetsInTemplate:true
		   ,templateString:templateString
		   ,_dialog:null
		   ,errorSourceObject:null
		   ,_result:null
		   ,_counter:0
		   ,_inProgress:false
		   
		   ,constructor:function(params, srcNodeRef){
				
			}
			,postCreate:function(){

			}
			,sleep: function (ms) {
			  //console.log(new Date().getTime());
			  //yield ms;
			  return new Promise(resolve => setTimeout(resolve, ms));
			  
			}

		   , show: async function(input){
			   if(!this._inProgress){
					this._inProgress=true;
					var self=this;
					this._dialog.show();
					this._counter=0;
					this._iframe.onload=function(e){
						self.waitLoginFormLoading(e);
					}
					this._iframe.srcdoc=input;
					
			   }
					while(this._result==null || this._counter<2) await this.sleep(100);
					this._inProgress=false;
					this._dialog.hide();
					return this._result;
		   }
		   ,hide(){
			   this._dialog.hide();
		   }
		   ,onClose:function(e){
			   this.inherited(args);
			   this.destroy();
		   }
		   ,waitLoginFormLoading:function(retryFunc,okCallback,errCallback){
				this._counter++;
				if(this._counter>1){
					if(this._iframe.contentWindow.document.contentType=="text/html"){
						this._result=this._iframe.contentDocument.all[0].outerHTML;
					}else{
						this._result=this._iframe.contentWindow.document.body.innerText;
					}
				}
		   }

		});
		new lh();
		return lh;
	}else{
		return lh;
	}
	
});
