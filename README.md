# Opalescent Parallax Waves Visualizer

**Public visualization:** https://dgmora.github.io/opalescent-parallax-waves-visualizer/

An interactive visualizer for the **Parallax Wave + Opalescence** stack interactions in Magic: The Gathering.

The goal is to make the multi-Wave sequences easier to follow by showing, for every step:

- each Parallax Wave and its remaining fade counters;
- which Waves are currently exiled and by which Wave;
- the stack from top to bottom;
- persistent action IDs that stay attached to the same activation/trigger;
- color-coded arrows between the source and target Waves;
- several distinct lines from the same initial position.

## Scenarios

The current visualizer includes four lines:

1. **Conservative stalemate — Twin resets T2 correctly**  
   The basic safe line. Solo lets `T2→S` resolve, then Twin resets T2 in response to `S→T2` and preserves the two-Wave position.

2. **Twin test C — C knows the response**  
   Twin commits more heavily with `T2→T2`; Solo uses the extra `S→T1` during B's reset gap and the position loops back.

3. **Twin test C — C misses the response**  
   Solo lets `Return(T2)` resolve without adding the extra threat and can become stranded in exile.

4. **C tests Twin — B gets greedy**  
   Solo follows the simple line, but Twin fails to reset in response to `S→T2`, losing one of the two Waves and collapsing toward a 1v1.

## Sequence DSL

The scenarios are deliberately data-driven so new lines can be added without writing new rendering code.

### Board state

```text
T14 T23 S2
```

means A has 4 counters, B has 3, and C has 2.

Special forms:

```text
T2x   # T2 is exiled
SxT2  # S is exiled by T2
T15!  # T1 is a freshly returned/new game object with 5 counters
```

### Stack

```text
T2>S | S>T2 | T2>S | S>T1 | T1>S | S>S | Fading(S)
```

The left-most entry is the top of the stack.

Other forms include:

```text
T2>T2       # T2 targets itself / reset attempt
Return(T2)  # T2's leave-the-battlefield return trigger
Fading(S)   # S's fading trigger
```

The renderer assigns each newly created stack object a persistent numeric ID. The same number is used on its stack entry and board arrow until that object leaves the stack.

## Shared sequence segments

Scenarios are composed from reusable segments rather than duplicating the common opening. For example:

```js
["opening_to_key", "ab_correct_reset"]
```

and:

```js
["opening_to_key", "ab_tests_c_setup", "c_correct_response"]
```

This keeps the common stack sequence in one place and makes alternative branches easier to compare.



## References

The interaction is based on the discussion around **Parallax Wave + Opalescence** and this article. Some of the scenarios are also based on conversations from the **Replenish Discord**:

https://docs.google.com/document/d/e/2PACX-1vQEW3hgl_gxjLwuTjdH5hoIZKxWNXAUotSipazs2pv60AzC0CUuwrjxjINJkgVfnKOquMgIgm6HZHc4/pub

The displayed Parallax Wave card image is loaded from Scryfall.

Magic: The Gathering, Parallax Wave, Opalescence, and related card names are property of Wizards of the Coast. This project is an unofficial rules/strategy visualization.
