from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import time
from PIL import Image
from io import BytesIO
from pathlib import Path
import hashlib
import json
import requests
from typing import List, Optional
import logging
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("casla-quartz-api")

# Initialize FastAPI app
app = FastAPI(
    title="CaslaQuartz Image Generation API",
    description="API for generating quartz marble product images",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SAVE_DIR = os.getenv("SAVE_DIR", "/tmp/generated_images")
API_KEY_TOKEN = os.getenv("API_KEY_TOKEN")
URL_PRE = os.getenv("URL_PRE")
Path(SAVE_DIR).mkdir(exist_ok=True, parents=True)

# Product image mapping - should be loaded from a database or config file
PRODUCT_IMAGE_MAP = {
    # Example: "CQ001": "/path/to/texture/CQ001.jpg"
}

# Dependency for API key validation
def verify_api_key():
    if not API_KEY_TOKEN:
        raise HTTPException(
            status_code=500, 
            detail="API key not configured. Please set the API_KEY_TOKEN environment variable."
        )
    return API_KEY_TOKEN

# Pydantic models
class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    size_choice: str = Field(..., description="Image size (e.g., '1024x768' or 'Custom size')")
    custom_size: Optional[str] = Field(None, description="Custom size (e.g., '1280x720')")
    product_codes: List[str] = Field(..., description="List of product codes")

class Img2ImgRequest(BaseModel):
    position: str = Field(..., description="Position to apply texture")
    size_choice: str = Field(..., description="Image size")
    custom_size: Optional[str] = Field(None, description="Custom size (e.g., '1280x720')")
    product_codes: List[str] = Field(..., description="Selected product codes")

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# Endpoints
@app.post("/text2img", summary="Generate image from text prompt", response_class=FileResponse)
async def text2img(request: GenerateRequest, api_key: str = Depends(verify_api_key)):
    try:
        # Validate size
        width, height = parse_size(request.size_choice, request.custom_size)

        # Rewrite prompt with Groq
        rewritten_prompt = rewrite_prompt_with_groq(request.prompt, request.product_codes)
        logger.info(f"Rewritten prompt: {rewritten_prompt}")

        # Generate image using txt2img function
        result = txt2img(rewritten_prompt, width, height, request.product_codes)

        if isinstance(result, str):
            raise HTTPException(status_code=500, detail=result)

        # Save and return the image
        save_path = Path(SAVE_DIR) / f"{hashlib.md5(request.prompt.encode()).hexdigest()}.png"
        result.save(save_path)
        return FileResponse(
            path=str(save_path), 
            media_type="image/png", 
            filename="generated_image.png"
        )

    except Exception as e:
        logger.error(f"Error in text2img: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/img2img", summary="Generate image from input image", response_class=FileResponse)
async def img2img(
    image: UploadFile = File(...),
    request: Img2ImgRequest = Depends(),
    api_key: str = Depends(verify_api_key)
):
    try:
        # Validate size
        width, height = parse_size(request.size_choice, request.custom_size)

        # Save uploaded image
        image_path = Path(SAVE_DIR) / f"input_{int(time.time())}.jpg"
        with open(image_path, "wb") as f:
            f.write(await image.read())

        logger.info(f"Saved input image to {image_path}")

        # Upload image to TensorArt
        image_resource_id = upload_image_to_tensorart(str(image_path))
        if not image_resource_id:
            raise HTTPException(status_code=500, detail="Failed to upload input image.")

        # Generate mask and apply texture
        output_path = generate_mask(image_resource_id, request.position, request.product_codes[0])
        if not output_path:
            raise HTTPException(status_code=500, detail="Failed to generate image.")

        # Return the generated image
        return FileResponse(
            path=output_path, 
            media_type="image/jpeg", 
            filename="output_image.jpg"
        )

    except Exception as e:
        logger.error(f"Error in img2img: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def parse_size(size_choice: str, custom_size: Optional[str]) -> tuple:
    """Parse and validate image size"""
    try:
        if size_choice == "Custom size":
            if not custom_size:
                raise ValueError("Custom size is required when size_choice is 'Custom size'")
            width, height = map(int, custom_size.split("x"))
        else:
            width, height = map(int, size_choice.split("x"))

        # Validate dimensions
        if width <= 0 or height <= 0:
            raise ValueError("Width and height must be positive integers")

        return width, height
    except Exception as e:
        raise ValueError(f"Invalid size format: {str(e)}")

def rewrite_prompt_with_groq(vietnamese_prompt: str, product_codes: List[str]) -> str:
    """Enhance the prompt with product codes"""
    prompt = f"{vietnamese_prompt}, featuring {' and '.join(product_codes)} quartz marble"
    return prompt

@lru_cache(maxsize=10)
def load_product_image_map():
    """Load product image mapping from configuration or database"""
    # This should be implemented to load from a database or config file
    # For now, we'll return a static mapping
    return PRODUCT_IMAGE_MAP

def txt2img(prompt: str, width: int, height: int, product_codes: List[str]) -> Image.Image:
    """Generate image from text prompt"""
    if not API_KEY_TOKEN or not URL_PRE:
        raise ValueError("API_KEY_TOKEN and URL_PRE environment variables must be set")
    
    model_id = "779398605850080514"
    vae_id = "ae.sft"
    request_id = hashlib.md5(str(int(time.time())).encode()).hexdigest()
    
    logger.info(f"Starting txt2img job with request_id: {request_id}")

    txt2img_data = {
        "request_id": request_id,
        "stages": [
            {"type": "INPUT_INITIALIZE", "inputInitialize": {"seed": -1, "count": 1}},
            {
                "type": "DIFFUSION",
                "diffusion": {
                    "width": width,
                    "height": height,
                    "prompts": [{"text": prompt}],
                    "negativePrompts": [{"text": " "}],
                    "sdModel": model_id,
                    "sdVae": vae_id,
                    "sampler": "Euler a",
                    "steps": 30,
                    "cfgScale": 8,
                    "clipSkip": 1,
                    "etaNoiseSeedDelta": 31337,
                }
            }
        ]
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {API_KEY_TOKEN}'
    }
    
    try:
        response = requests.post(f"{URL_PRE}/jobs", json=txt2img_data, headers=headers)
        response.raise_for_status()
        
        response_data = response.json()
        job_id = response_data['job']['id']
        logger.info(f"Job created. ID: {job_id}")
        
        # Poll for job completion
        start_time = time.time()
        timeout = 300
        
        while True:
            time.sleep(10)
            elapsed_time = time.time() - start_time
            
            if elapsed_time > timeout:
                raise TimeoutError(f"Job timed out after {timeout} seconds")
                
            response = requests.get(f"{URL_PRE}/jobs/{job_id}", headers=headers)
            response.raise_for_status()
            
            job_data = response.json()
            job_status = job_data['job']['status']
            
            if job_status == 'SUCCESS':
                image_url = job_data['job']['successInfo']['images'][0]['url']
                logger.info(f"Job completed successfully. Image URL: {image_url}")
                
                response_image = requests.get(image_url)
                response_image.raise_for_status()
                
                img = Image.open(BytesIO(response_image.content))
                save_path = Path(SAVE_DIR) / f"{hashlib.md5(prompt.encode()).hexdigest()}.png"
                img.save(save_path)
                
                logger.info(f"Image saved to: {save_path}")
                return img
                
            elif job_status == 'FAILED':
                error_info = job_data['job'].get('failureInfo', {}).get('message', 'Unknown error')
                raise RuntimeError(f"Job failed: {error_info}")
                
    except requests.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        raise RuntimeError(f"API request failed: {str(e)}")

def upload_image_to_tensorart(image_path: str) -> str:
    """Upload image to TensorArt and return resource ID"""
    if not API_KEY_TOKEN or not URL_PRE:
        raise ValueError("API_KEY_TOKEN and URL_PRE environment variables must be set")
        
    try:
        url = f"{URL_PRE}/resource/image"
        payload = json.dumps({"expireSec": "7200"})
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {API_KEY_TOKEN}'
        }
        
        logger.info(f"Starting upload for: {image_path}")
        
        if not os.path.exists(image_path):
            logger.error(f"File does not exist: {image_path}")
            return None
            
        response = requests.post(url, headers=headers, data=payload, timeout=30)
        response.raise_for_status()
        
        resource_response = response.json()
        
        put_url = resource_response.get('putUrl')
        headers_put = resource_response.get('headers', {'Content-Type': 'image/jpeg'})
        
        if not put_url:
            logger.error(f"Upload failed - No 'putUrl' in response: {resource_response}")
            return None
        
        logger.info(f"Got putUrl: {put_url}")
        
        with open(image_path, 'rb') as img_file:
            upload_response = requests.put(put_url, data=img_file, headers=headers_put)
            
            if upload_response.status_code not in [200, 203]:
                raise Exception(f"PUT failed with status {upload_response.status_code}: {upload_response.text}")
                
            if upload_response.status_code == 203:
                logger.warning("Warning: PUT returned 203 - CallbackFailed, but proceeding with resourceId")
        
        resource_id = resource_response.get('resourceId')
        
        if not resource_id:
            logger.error(f"Upload failed - No 'resourceId' in response: {resource_response}")
            return None
            
        logger.info(f"Upload successful - resourceId: {resource_id}")
        
        # Wait for resource synchronization
        time.sleep(10)
        logger.info(f"Waited 10s for resource sync: {resource_id}")
        
        return resource_id
        
    except Exception as e:
        logger.error(f"Upload error for {image_path}: {str(e)}")
        return None

def generate_mask(image_resource_id: str, position: str, selected_product_code: str) -> str:
    """Generate mask and apply texture to image"""
    try:
        if not image_resource_id:
            raise ValueError("Invalid image_resource_id - original image not uploaded")
            
        logger.info(f"Using image_resource_id: {image_resource_id}")
        
        # Wait for resource synchronization
        time.sleep(10)
        
        # Get product texture
        product_image_map = load_product_image_map()
        short_code = selected_product_code.split()[0]
        texture_filepath = product_image_map.get(selected_product_code)
        
        logger.info(f"Texture file: {texture_filepath}, exists: {os.path.exists(texture_filepath) if texture_filepath else False}")
        
        if not texture_filepath or not os.path.exists(texture_filepath):
            raise ValueError(f"Texture image not found for product code {short_code}")
        
        # Upload texture
        texture_resource_id = upload_image_to_tensorart(texture_filepath)
        logger.info(f"Texture resource_id: {texture_resource_id}")
        
        if not texture_resource_id:
            raise ValueError(f"Failed to upload texture image for {short_code}")
            
        # Wait for resource synchronization
        time.sleep(10)
        
        # Handle position parameter
        if isinstance(position, (set, list)):
            position = position[0] if position else "default"
            
        logger.info(f"Position: {position}, type: {type(position)}")
        
        # Define workflow parameters
        workflow_params = {
            # Workflow parameters as in the original code
            "1": {
                "classType": "LayerMask: SegmentAnythingUltra V3",
                "inputs": {
                    "black_point": 0.3,
                    "detail_dilate": 6,
                    "detail_erode": 65,
                    "detail_method": "GuidedFilter",
                    "device": "cuda",
                    "image": ["2", 0],
                    "max_megapixels": 2,
                    "process_detail": True,
                    "prompt": ["4", 0],
                    "sam_models": ["3", 0],
                    "threshold": 0.3,
                    "white_point": 0.99
                },
                "properties": {"Node name for S&R": "LayerMask: SegmentAnythingUltra V3"}
            },
            # ... other workflow parameters
            "17": {
                "classType": "TensorArt_LoadImage",
                "inputs": {
                    "_height": 768,
                    "_width": 512,
                    "image": texture_resource_id,
                    "upload": "image"
                },
                "properties": {"Node name for S&R": "TensorArt_LoadImage"}
            },
            "2": {
                "classType": "TensorArt_LoadImage",
                "inputs": {
                    "_height": 1024,
                    "_width": 768,
                    "image": image_resource_id,
                    "upload": "image"
                },
                "properties": {"Node name for S&R": "TensorArt_LoadImage"}
            },
            "4": {
                "classType": "TensorArt_PromptText",
                "inputs": {"Text": position.lower()},
                "properties": {"Node name for S&R": "TensorArt_PromptText"}
            }
        }
        
        payload = {
            "requestId": f"workflow_{int(time.time())}",
            "params": workflow_params,
            "runningNotifyUrl": ""
        }
        
        # Run workflow
        output_path = run_workflow(payload, "full_workflow")
        return output_path
        
    except Exception as e:
        logger.error(f"Mask generation error: {str(e)}")
        return None

def run_workflow(payload: dict, workflow_name: str) -> str:
    """Run TensorArt workflow and return output image path"""
    if not API_KEY_TOKEN or not URL_PRE:
        raise ValueError("API_KEY_TOKEN and URL_PRE environment variables must be set")
        
    try:
        url = f"{URL_PRE}/workflow/run"
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {API_KEY_TOKEN}'
        }
        
        logger.info(f"Running workflow: {workflow_name}")
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        workflow_response = response.json()
        workflow_id = workflow_response.get('workflowId')
        
        if not workflow_id:
            raise ValueError(f"No workflow ID in response: {workflow_response}")
            
        logger.info(f"Workflow started with ID: {workflow_id}")
        
        # Poll for workflow completion
        start_time = time.time()
        timeout = 300
        
        while True:
            time.sleep(10)
            elapsed_time = time.time() - start_time
            
            if elapsed_time > timeout:
                raise TimeoutError(f"Workflow timed out after {timeout} seconds")
                
            status_url = f"{URL_PRE}/workflow/status/{workflow_id}"
            status_response = requests.get(status_url, headers=headers)
            status_response.raise_for_status()
            
            status_data = status_response.json()
            workflow_status = status_data.get('status')
            
            if workflow_status == 'COMPLETED':
                # Get output image URL
                output_url = status_data.get('outputUrl')
                
                if not output_url:
                    raise ValueError("No output URL in completed workflow")
                    
                # Download output image
                output_response = requests.get(output_url)
                output_response.raise_for_status()
                
                output_path = Path(SAVE_DIR) / f"output_{workflow_id}.jpg"
                
                with open(output_path, 'wb') as f:
                    f.write(output_response.content)
                    
                logger.info(f"Workflow output saved to: {output_path}")
                return str(output_path)
                
            elif workflow_status in ['FAILED', 'ERROR']:
                error_message = status_data.get('errorMessage', 'Unknown error')
                raise RuntimeError(f"Workflow failed: {error_message}")
                
    except Exception as e:
        logger.error(f"Workflow error: {str(e)}")
        raise

# Health check endpoint
@app.get("/health", summary="Health check endpoint")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

if __name__ == "__main__":
    import uvicorn
    
    # Add sample product mapping for testing
    PRODUCT_IMAGE_MAP = {
        "C1012 Glacier White": "product_images/C1012.jpg",
        "C1026 Polar": "product_images/C1026.jpg",
        "C3269 Ash Grey": "product_images/C3269.jpg",
        "C3168 Silver Wave": "product_images/C3168.jpg",
        "C1005 Milky White": "product_images/C1005.jpg",
        "C2103 Onyx Carrara": "product_images/C2103.jpg",
        "C2104 Massa": "product_images/C2104.jpg",
        "C3105 Casla Cloudy": "product_images/C3105.jpg",
        "C3146 Casla Nova": "product_images/C3146.jpg",
        "C2240 Marquin": "product_images/C2240.jpg",
        "C2262 Concrete (Honed)": "product_images/C2262.jpg",
        "C3311 Calacatta Sky": "product_images/C3311.jpg",
        "C3346 Massimo": "product_images/C3346.jpg",
        "C4143 Mario": "product_images/C4143.jpg",
        "C4145 Marina": "product_images/C4145.jpg",
        "C4202 Calacatta Gold": "product_images/C4202.jpg",
        "C1205 Casla Everest": "product_images/C1205.jpg",
        "C4211 Calacatta Supreme": "product_images/C4211.jpg",
        "C4204 Calacatta Classic": "product_images/C4204.jpg",
        "C1102 Super White": "product_images/C1102.jpg",
        "C4246 Casla Mystery": "product_images/C4246.jpg",
        "C4345 Oro": "product_images/C4345.jpg",
        "C4346 Luxe": "product_images/C4346.jpg",
        "C4342 Casla Eternal": "product_images/C4342.jpg",
        "C4221 Athena": "product_images/C4221.jpg",
        "C4255 Calacatta Extra": "product_images/C4255.jpg",
    }
    
    # Create sample texture directory
    Path("./textures").mkdir(exist_ok=True)
    
    # Run the server
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
