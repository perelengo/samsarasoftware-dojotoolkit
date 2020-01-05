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
var samsarasoftware={};
samsarasoftware.include=function include(src){
	
					var detectEditors=function(){
						var editors=new Array();
						try{
							if(davinci){editors["davinci"]=davinci};
						}catch(e){	
						}
						
						return editors;
					}

					var editors=detectEditors();

					//no hay editores, hacemos el include
					if(editors.length==0){
						  var xmlhttp;
						  if (window.XMLHttpRequest) {
							xmlhttp = new XMLHttpRequest();
						  } else {
							xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
						  }
						  xmlhttp.onreadystatechange = function() {
							if (this.readyState == 4 && this.status == 200) {
							  document.write(this.responseText.replace(/^<template>([\s\S]*)<\/template>/i,"$1"));
							}
						  };
						  xmlhttp.open("GET", src, false);
						  xmlhttp.send();

					}
}

