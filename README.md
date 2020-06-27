<img src="https://github.com/SnaveSutit/mcbuild/blob/master/assets/MCB%20Title%20B.png" alt="MCB Banner"/>

# mc-build

mc-build is a cli tool that helps with the creation of data packs through compiling a custom format to functions. the cli by default ships with just the mc language although you can add more languages by putting them in the `lang` folder in your project root.


## cli
|command | result|
|--------|-------|
|`mcb` | will build the project in the active directory|
|`mcb -config [js,json]` | generate a config file based on the default configs of all loaded languages. |

## installation

### yarn
```bash
$ yarn global add mc-build
```

### npm
```bash
$ npm i -g mc-build
```

## MC Language Examples

### Functions
```
function example_function{
    say hello, this is a function
}
```
### Clocks
```
clock 5t{
  say i will be called every 5 ticks
}

clock 2s{
  say i will be called every 2 seconds
}

clock 1.5d{
  say i will be called every 1.5 days
}

```

### Compile Time If
```
function ex{
  !IF(this.dev){
    This code will only appear in this function if the value of dev is truthy in the config
  }
}
```

### Shorthand Compile Time If
```
function ex{
  !dev{
    This code will only appear in this function if the value of dev is truthy in the config
  }
}
```

### Compile Time Loop
`LOOP(count,var_name)`

Repeats the following block `count` number of times durring compilation. The loop's value is passed as `this.var_name`
```
function ex{
  LOOP(5,i){
    say <%this.i%>
  }
}
```
Warning: Defining inline functions within compile-time loops is not a good idea as it will generate a different function for every loop

### Run Time If/Else/Elseif
The if condition is an execute subcommand chain, eg: `if score foo bar matches 1..`
```
if(if score foo bar matches 0){
  say 0
}else if(if score foo bar matches 1){
  say 1
}else{
  say not 0 or 1
}
```
Note that if statements can be used recursively without issue:
```
function subtract {
  if(if score foo bar matches 1..){
    say subtracting!
    scoreboard players remove foo bar 1
    function subtract
  }else{
    say done subtracting!
  }
}
```

### Execute Block
Creates and inline function called via an execute command
```
execute as @a at @s run{
  say hi
}
```

### Inline Block
Creates an inline function
```
inline{
  say hi
}
```

### `$top`, `$parent`, and `$block`
#### `$block`
`$block` references the current function that a command is ran in:
```
function crash_my_game_plz_thangkz{
  say I'm an infinite loop!!
  function $block
}
```
`$block` works in all forms of blocks:
```
inline{
  say I can haz infinity
  function $block
}

execute positioned ~ ~1 ~ run{
  function $block
}

if(if score foo bar matches 1){
  say If this if statement is true; It will enter an infinite loop, and I will fill your chat forever :)
  function $block
}

wait(if score foo bar matches 1){
  say All of these examples are infinite loops, they're just helping show where $block can be used
  function $block
}
```
#### `$parent`
`$parent` references the current function's parent function. Pretty self explanitory.
```
function foo{
  inline{
    say Wow, another infinite loop. Reallllly creative with these examples guys
    function $parent
  }
}
```
`$parent` cannot be used in the base level of a function, or a clock. Doing so will throw an error durring compilation:
```
function foo{
  function $parent
}

>>> ERROR: $parent used where there is no valid parent.
```
#### `$top`
`$top` is used in if statements to refer to the block at the top of the if chain. In this example it will refer to the `inline` block:
```
function foo{
  inline{
    if(unless block ~ ~ ~ air){
      say Hit Block
    }else{
      function $top
    }
  }
}
```

#### Compile Time Inline Code Blocks
inline js code blocks are run at compile time and the result is embedded wherever it is.
```
function ex{
  say Wow. <%Math.random()%> is a random number >.>
}
```

#### Run Time Wait
`wait(condition,poll_rate)`

Waits until `condition` returns true

`condition` is an execute subcommand chain. (`if score #foo bar matches 1..`)

`poll_rate` is an MC time value, exactly like the one used in the schedule command (11t = 11 ticks, 1s = 1 second, 5d = 5 days)

```
function ex{
  wait(if score deaths value matches 10..,1s){
    say you have died 10 times.
  }
}
```


#### Namespaces
Namespaces are used to create multi-layer datapacks. Each namespace has it's own separate `tick` and `load` functions, clock functions, and `__generated__` folder.
```
namespace foo/bar{
  namespace baz{
    function hello{
      say Hello!
    }
  }
}
```
will create a function at filename:foo/bar/baz/hello.mcfunction
