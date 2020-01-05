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

require(["dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin","dojo/ready","dojo/dom","dojo/_base/fx","dojo/dom-style"],
    function(declare, _WidgetBase, _TemplatedMixin,ready,dom,fx,domStyle){
        return declare("samsarasoftware/layout/LoadingOverlay", [_WidgetBase, _TemplatedMixin], {
			templateString:"<div id='${id}'  class='loadingOverlay' data-dojo-attach-point='containerNode'></div>"

				,constructor:function(){
					// save a reference to the overlay
					this.inherited(arguments);
				}
				
				// called to show the loading overlay
				,beginLoading:function(){
						domStyle.set(this.domNode, 'display', 'block');
						fx.fadeIn({
							node: this.domNode,
						}).play();
				}
		
				// called to hide the loading overlay
				,endLoading:function(){
						fx.fadeOut({
							node: this.domNode,
							onEnd: function(node){
								domStyle.set(node, 'display', 'none');
							}
						}).play();
				}
				,buildRendering: function(){
					this.inherited(arguments);
					document.loadingOverlay=this;
					
					ready(function(){
						document.loadingOverlay.endLoading();
					});		
					
				}
    		
        });
		
	
 });
