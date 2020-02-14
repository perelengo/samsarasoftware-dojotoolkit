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
require(["dojo/_base/declare", "dijit/form/DateTextBox", "dojo/dom"],
        function(declare, DateTextBox, dom){
    return declare("samsarasoftware/form/TimeStampTextBox", DateTextBox, {
       
        serialize: function(dateObject, options){
			console.log(dateObject.toISOString());
            return dateObject.toISOString();
        },
		_setValueAttr: function(/*Date|String*/ value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue){
			if(value!=null){
				var now=new Date();
				var copy=new Date(value.getTime());
				value.setUTCFullYear(copy.getUTCFullYear());
				value.setUTCMonth(copy.getUTCMonth(),copy.getUTCDate()+1);
				value.setUTCHours(now.getUTCHours());
				value.setUTCMinutes(now.getUTCMinutes());
				value.setUTCSeconds(now.getUTCSeconds());
				value.setUTCMilliseconds(now.getUTCMilliseconds());
				return this.inherited(arguments);
			}
		}
    });
    
});
