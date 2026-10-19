import os
from PIL import Image, ImageDraw

def generate_icon(size):
    # Create 4x supersampled image for ultra crisp antialiasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    corner_radius = int(canvas_size * 0.22)
    
    # Gradient simulation from top-left indigo (#4f46e5) to bottom-right violet (#7c3aed)
    for y in range(canvas_size):
        factor = y / canvas_size
        r = int(79 + (124 - 79) * factor)
        g = int(70 + (58 - 70) * factor)
        b = int(229 + (237 - 229) * factor)
        # We can draw rounded rect mask later
    
    # Base rounded rect
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    margin = int(canvas_size * 0.04)
    mask_draw.rounded_rectangle(
        [margin, margin, canvas_size - margin, canvas_size - margin],
        radius=corner_radius,
        fill=255
    )

    bg = Image.new("RGBA", (canvas_size, canvas_size), (79, 70, 229, 255))
    bg_draw = ImageDraw.Draw(bg)
    # Add subtle vertical gradient
    for y in range(canvas_size):
        t = y / canvas_size
        r = int(79 * (1 - t) + 124 * t)
        g = int(70 * (1 - t) + 58 * t)
        b = int(229 * (1 - t) + 237 * t)
        bg_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))

    img.paste(bg, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    # Draw soundwave / equalizer bars in center
    # 5 bars with varying heights representing audio echo
    center_x = canvas_size / 2
    center_y = canvas_size / 2
    bar_width = max(scale, int(canvas_size * 0.09))
    gap = max(scale, int(canvas_size * 0.055))
    
    # Normalized heights (-1 to 1 around center)
    heights = [0.35, 0.65, 0.85, 0.55, 0.3]
    total_w = len(heights) * bar_width + (len(heights) - 1) * gap
    start_x = center_x - total_w / 2

    for i, h in enumerate(heights):
        bx = start_x + i * (bar_width + gap)
        bh = canvas_size * 0.65 * h
        by1 = center_y - bh / 2
        by2 = center_y + bh / 2
        r = bar_width / 2
        # White with high opacity
        draw.rounded_rectangle([bx, by1, bx + bar_width, by2], radius=r, fill=(255, 255, 255, 250))

    # Resize down with high quality Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

os.makedirs("/home/thirdweb/work/Tabwave/public/icon", exist_ok=True)
for s in [16, 32, 48, 96, 128]:
    icon = generate_icon(s)
    icon.save(f"/home/thirdweb/work/Tabwave/public/icon/{s}.png", "PNG")
    print(f"Generated {s}x{s} icon")
