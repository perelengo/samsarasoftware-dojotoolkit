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


define('samsarasoftware/window/WindowManager',[
	"dojo/_base/declare",
	"dijit/registry",
	"dojo/dom",
	"dojo/dom-form",
	"dojo/_base/lang",
	"dijit/layout/TabContainer",
 	"dijit/layout/AccordionContainer",
	"dijit/TitlePane",
    "dijit/Dialog",
	"gridx/Grid"
	], 
	function(declare,Registry,dom,dom_form,lang, TabContainer, AccordionContainer,TitlePane,Dialog,Gridx){	
		
		
		
		return {
			show: function (panelId,containerId){					
				var container=(containerId)?dijit.byId(containerId):null;
				var panel=dijit.byId(panelId);
				
					
				if(containerId && (container instanceof TabContainer
									|| container instanceof AccordionContainer)
				){ 
					container.domNode.style.display = 'block';
					if(window[panelId+"_temp"]){
						container.addChild(window[panelId+"_temp"]);
					};
					panel.style.display='block';
					container.selectChild(dijit.byId(panelId),true);
					container.resize();
					delete window[panelId+"_temp"];
				}else if(panel instanceof Dialog){
					panel.show();
					panel.resize();
				}else if(panel instanceof TitlePane){
					panel.open(true);
				}else if(panel instanceof Gridx){	
					panel.domNode.style.display = 'block';
					panel.resize();
				}else{
					panel.domNode.style.display = 'block';
					panel.resize();
				}
			}
			
			,hide: function(panelId,containerId){
				var container=(containerId)?dijit.byId(containerId):null;
				var panel=dijit.byId(panelId);
				
				if(containerId && (container instanceof TabContainer
									|| container instanceof AccordionContainer)
				){
					window[panelId+"_temp"]=panel;
					container.removeChild(window[panelId+"_temp"],true);
					if(!container.hasChildren()){
						container.domNode.style.display = 'none';
					}
				}else if(panel instanceof Dialog){
					panel.hide();
				}else if(panel instanceof TitlePane){
					panel.open(false);					
				}else if(panel instanceof Gridx){		
					panel.domNode.style.display = 'none';
					panel.resize();
				}else{
					panel.domNode.style.display = 'none';
				}			
			}
			
			
		};
});
