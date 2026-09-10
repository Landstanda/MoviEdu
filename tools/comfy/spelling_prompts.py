"""Kindergarten flashcard subjects for start-here CVC words.

Each value is only the subject clause. The job adds the shared photo trailer.
Senses are fixed in Python so homographs stay consistent (bat=baseball, jam=jar).
"""

from __future__ import annotations

# Shared with the bag/cat gold that already looked right.
TRAILER = (
    "Isolated on a pure white studio background, no floor, no furniture unless "
    "it is the subject, no cartoon, no clipart, no drawing, no illustration, "
    "no 3D icon, no text, no logos, no watermarks. Real-world photo, sharp, "
    "simple kindergarten flashcard, landscape composition."
)

# word -> subject (no trailing period required)
SUBJECTS: dict[str, str] = {
    "bag": "a single cloth tote bag, empty, standing upright",
    "bat": "a real wooden baseball bat standing upright, visible wood grain, studio product photo of a physical bat",
    "cap": "a single blue baseball cap",
    "cat": "a single real tabby house cat sitting, full body visible",
    "dad": "a kind adult father standing, full body, modest everyday clothes, G-rated, smiling",
    "fan": "a small electric desk fan, unplugged, no brand marks",
    "ham": "a cooked ham on a bone, whole, no plate garnish clutter",
    "hat": "a simple child's sun hat",
    "jam": "a glass jar of strawberry jam, lid on, no readable label",
    "man": "an adult man standing, full body, modest everyday clothes, G-rated",
    "map": "a folded paper road map, slightly open",
    "mat": "a rectangular fabric doormat, plain, no writing",
    "nap": "a young child sleeping peacefully on a small pillow, G-rated, full body",
    "pan": "an empty metal frying pan",
    "rat": "a real brown rat sitting, full body",
    "sad": "a young child looking sad, G-rated, head and shoulders, no tears of blood",
    "tag": "a blank cardboard gift tag with a string, no writing",
    "van": "a white minivan, side view, no readable plates or logos",
    "red": "a single bright red apple",
    "bib": "a baby bib, plain, no writing",
    "big": "a large African elephant standing, full body, showing it is big",
    "dig": "a small garden shovel standing in a tiny pile of dirt",
    "fin": "a real goldfish with its tail and dorsal fin clearly visible",
    "kid": "a young child standing, full body, modest clothes, G-rated",
    "lid": "a round metal pot lid",
    "lip": "a close-up of closed human lips, G-rated, no extra face clutter",
    "pig": "a real pink pig standing, full body",
    "pin": "a single metal safety pin, closed",
    "sip": "a clear cup with a straw and a little juice, no hands",
    "sit": "a young child sitting on a small wooden stool, side view, G-rated",
    "wig": "a short brown wig on a plain wig stand",
    "zip": "a metal clothing zipper, close-up, partly open",
    "run": "a young child running, full body, side view, G-rated",
    "box": "a closed brown cardboard box",
    "dog": "a friendly golden retriever sitting, full body",
    "dot": "a single large round red sticker dot",
    "fog": "a small pine tree in light fog",
    "fox": "a red fox sitting, full body",
    "hop": "a green frog mid-hop, full body",
    "hot": "a steaming mug, visible steam, no readable print",
    "log": "a short cut wooden log",
    "mom": "a kind adult mother standing, full body, modest everyday clothes, G-rated, smiling",
    "mop": "a string floor mop standing upright",
    "pop": "a bowl of popcorn",
    "pot": "an empty metal cooking pot",
    "top": "a wooden spinning top toy",
    "bug": "a real ladybug, close-up, full body",
    "bun": "a golden bakery hamburger bun",
    "bus": "a yellow school bus, side view, no readable type",
    "cub": "a lion cub sitting, full body",
    "cup": "a simple drinking cup, empty",
    "gum": "a piece of pink bubble gum, no wrapper text",
    "hug": "a young child hugging a teddy bear, G-rated",
    "jug": "a glass pitcher jug, empty",
    "mud": "a small pile of wet brown mud",
    "mug": "a plain ceramic coffee mug, empty, no print",
    "nut": "a walnut in its shell",
    "pup": "a puppy sitting, full body",
    "rug": "a small rectangular area rug, simple pattern, no letters",
    "sun": "the sun, a bright photoreal orange-yellow disk with soft rays",
    "tub": "an empty white bathtub",
    "bed": "a simple twin bed with a plain blanket, no writing on fabric",
    "hen": "a brown hen standing, full body",
    "jet": "a passenger jet airplane, side view, no readable airline marks",
    "leg": "a human lower leg and foot, side view, G-rated",
    "net": "a butterfly net",
    "pen": "a blue ballpoint pen",
    "pet": "a hamster sitting, full body",
    "ten": "two child hands showing all ten fingers, G-rated",
    "vet": "a veterinarian in a white coat examining a small dog, G-rated",
    "web": "a spider web, no giant scary spider",
    "wet": "a green leaf covered in water droplets",
    "ball": "a red rubber playground ball",
    "fish": "a real goldfish, full body",
    "jump": "a young child jumping in the air, full body, G-rated",
    "milk": "a clear glass of milk",
    "nest": "a bird nest made of twigs, empty",
    "sand": "a small pile of beige sand",
    "egg": "a single white chicken egg",
}


def prompt_for(word: str) -> str:
    key = word.strip().lower()
    subject = SUBJECTS[key]
    return f"Photorealistic photograph of {subject}. {TRAILER}"
