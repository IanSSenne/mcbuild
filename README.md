<img src="https://raw.githubusercontent.com/IanSSenne/mcbuild/master/assets/MCB%20Title%20B.png" alt="MCB Banner"/>

# mc-build

mc-build is a cli tool that helps with the creation of data packs through compiling a custom format to functions. the cli by default ships with just the mc language although you can add more languages by putting them in the `lang` folder in your project root.

## cli

| command                 | result                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `mcb`                   | will build the project in the active directory                               |
| `mcb -config [js,json]` | generate a config file based on the default configs of all loaded languages. |

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

### IMPORTANT!

as of version 2.2.x there are changes to the syntax that may break your project.

- `if`/`else if`/`else` has changed to `execute`/`execute if`/`else`
- `inline` has changed to `block`

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

**Warning**: Defining inline functions within compile-time loops is not a good idea as it will generate a different function for every loop

### Run Time async while/while/finally

#### while(condition)

`while(condition)`

Repeats the following block until the `condition` is not met then calls the finally block.

the `condition` is an execute sub command or chain of execute sub commands.

```
while(if score foo bar matches 10..){
  scoreboard players add foo bar 1
  say hi :)
}finally{
  say bye :(
}
```

#### async while(condition,rate)

`async while(condition,rate)`

Repeats the following block every `rate` units of time until the `condition` is not met then calls the finally block.

the `condition` is an execute sub command or chain of execute sub commands.
`time` is a valid time for the schedule command.

```
async while(if score foo bar matches 10..,1t){
  scoreboard players add foo bar 1
  say hi :)
}finally{
  say bye :(
}
```

### Run Time Execute/Execute if/Else

The if condition is an execute subcommand chain, eg: `if score foo bar matches 1..`

```
execute(if score foo bar matches 0){
  say 0
}else execute(if score foo bar matches 1){
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

### Block

Creates an function and calls it where the block is defined

```
block{
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

until(if score foo bar matches 1,1t){
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

#### Run Time Until

`until(condition,poll_rate)`

Waits until `condition` returns true

`condition` is an execute subcommand chain. (`if score #foo bar matches 1..`)

`poll_rate` is an MC time value, exactly like the one used in the schedule command (11t = 11 ticks, 1s = 1 second, 5d = 5 days)

```
function ex{
  until(if score deaths value matches 10..,1s){
    say you have died 10 times.
  }
}
```

#### Multi Line Script Block

`<%%` and `%%>`

the multiline script block can take a block of javascript and evaluate it without writing anything to the output file, it has access to 2 global values, a function `emit` which takes a string and will write it to the file and a constant `args` which is either an array or undefined. it is defined if the script block is used in a macro and contains an array of arguments to the macro.

#### schedule blocks

schedule blocks allow you to schedule a block for a later time. it will lose its execution context.

```
schedule 5t replace{
  say hi in the future
}
```

or

```
schedule 5t append{
  say hi in the future
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

The src folder directories also effect namespacing. For instance the file `src/name.mc` will be addressed via `name:...` while `src/foo/bar/baz.mc` will be addressed via `foo:bar/baz/...`

**Warning:** Using namespaces and the src file structure combined can cause conflicts:

`src/foo/bar.mc`:

```
function baz{
  say Hi
}
```

`src/foo.mc`:

```
namespace bar{
  function baz{
    say Hello
  }
}
```

These baz functions would conflict as they share the same function path.

### MACROS

#### import statement

`import file.mcm`

the import statement allows you to make the macros defined in another file accessible to the current file's scope

```
import ./test.mcm
```

#### top level macro statements (only \*.mcm)

the top level macro statement is used in a macro file to declare a macro.

```
macro test{
  say hi $$0
}
```

#### macro arguments (only \*.mcm)

macros can take arguments where the values `$$0` through `$$n` will be replaced with the nth argument when the macro is called.

#### macro calls

the `macro` statement can be used in any non top-level structure to call a macro, the first parameter is the name of the macro to use from the current file's scope. additional parameters are swapped into that macro for the macros arguments replacing the `$$n` placeholders.

this example will say `hi Ian` in chat when run assuming the above macro example is used to define the macro test.

```
function example{
  macro test Ian
}
```

#### warn and error

the `warn` and `error` keywords are compile time only and will either log a warning in the console containing the entire content of the line after them or throw a compiler error where the reason is the contents of the line after the keyword. these must be the first word in the line.

# I am not affiliated with Mojang in any way.
