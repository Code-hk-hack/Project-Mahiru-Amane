from PIL import Image

def create_collage():
    path_dir = r"C:\Users\acer\.gemini\antigravity-ide\brain\88e2f9d4-0796-44c9-8911-0807d6936828"
    img1_path = path_dir + r"\landing_page_1784454925346.png"
    img2_path = path_dir + r"\dashboard_page_1784454980894.png"
    img3_path = path_dir + r"\training_page_eval_1784455496941.png"
    
    img1 = Image.open(img1_path)
    img2 = Image.open(img2_path)
    img3 = Image.open(img3_path)
    
    # Calculate dimensions
    # Make img1 and img2 same width (half of target width)
    target_width = 1920
    half_width = target_width // 2
    
    # Resize img1
    ratio1 = half_width / img1.width
    img1 = img1.resize((half_width, int(img1.height * ratio1)))
    
    # Resize img2
    ratio2 = half_width / img2.width
    img2 = img2.resize((half_width, int(img2.height * ratio2)))
    
    # Resize img3 to full width
    ratio3 = target_width / img3.width
    img3 = img3.resize((target_width, int(img3.height * ratio3)))
    
    # Create new image
    total_height = max(img1.height, img2.height) + img3.height
    collage = Image.new('RGB', (target_width, total_height), (255, 255, 255))
    
    # Paste images
    collage.paste(img1, (0, 0))
    collage.paste(img2, (half_width, 0))
    collage.paste(img3, (0, max(img1.height, img2.height)))
    
    # Save collage
    out_path = path_dir + r"\linkedin_collage.png"
    collage.save(out_path)
    print("Collage saved at:", out_path)

if __name__ == "__main__":
    create_collage()
