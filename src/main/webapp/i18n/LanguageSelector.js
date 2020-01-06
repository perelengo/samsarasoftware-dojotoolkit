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

require(["dojo/ready","dojo/_base/xhr","dojo/parser","dojo/_base/config","dojo/_base/Deferred","dojo/_base/lang","dojo/promise/all","samsarasoftware/i18n/I18n","dojo/parser","dojo/string","dojo/_base/config"], function(ready,xhr,parser,config,Deferred,lang,All,I18n,parser,dojoString,config){
ready(80,function(){ //Registers a function to fire after DOM ready but before the dojo/parser completes.
	
		
		var i18n=new I18n();
		i18n.getData("nls/"+__locale+"/i18n.js",{}).then(
			function(res){
					i18n.i18n=lang.mixin(res,self.i18n)
					var a=i18n.translate(document.body.innerHTML);
					document.body.innerHTML=null;
					document.body.innerHTML=a;
					if(!config.parseOnLoad)
						parser.parse(document.body);
					
		});
		
	});
});



define(["dojo/_base/declare", "dojo/ready","dijit/form/Select", "dojo/cookie"],
	function(declare, ready,Select,Cookie){
        return declare("samsarasoftware/i18n/LaguajeSelector", [Select], 
			 {
				userLabels:false
				,locales:{}
				,i18nSelect: function(e){
					Cookie("locale",this.get('value').replace("-","_"),{expires: (365*24*60*60*1000),path:'/'});
					
					if(e!=__locale)
						window.location.reload( false );
				}
				
				,buildRendering: function(){
					this.inherited(arguments);
					var _widget=this;
					
					ready(function(){
						_widget.set('value',__locale);
					});		
					
				}
				,postCreate: function(){
					this.inherited(arguments);
				}
				,onChange: function(e){
					this.inherited(arguments,[e]);
					this.i18nSelect(e);

				}
		});
});
