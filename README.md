# Ruler-from-Token

Similar to https://github.com/wsaunders1014/ShowDragDistance it extends the ruler from the token (if one is selected).
No drag support but the camera can be moved while token gets moved.

# Functions
* Use ctrl to start a ruler from your selected token
* Press X to increment the difficult terrain modifier
* Press Y to decrease the difficult terrain modifier

![Example](https://raw.githubusercontent.com/Nordiii/rulerfromtoken/master/Config.PNG)
![Example](https://raw.githubusercontent.com/Nordiii/rulerfromtoken/master/Difficult%20Terrain%20v2.gif)
# Changelog:
#### 0.1.3
* Add option with shortcut to reset current local data to fix issues if appearing
* Add option to enable difficult terrain multiplier for every ruler, not only those expanding from a selected token
* Add multiple language support

#### 0.1.2
* Instantly broadcast updated multiplier

#### 0.1.0

* Support multiple difficult multipliers.
* increment the multiplier by a set amount (default 1) to the maximum multiplier (default 2).
* Cycle through with X incrementing the multiplier 
* Cycle through with Y decreasing the multiplier

#### 0.0.4

* Sync difficult terrain between players, the ruler now shows for everybody the same correct distance value

#### 0.0.3

* Fixed bug not rendering ruler for other players in case of an square grid
