import React, { useState } from 'react';
import axios from 'axios';
import Dropzone from 'react-dropzone';
import './App.css';

const API_URL = 'YOUR_VERCEL_API_URL'; // Thay bằng URL Vercel của bạn

function App() {
  const [textPrompt, setTextPrompt] = useState('');
  const [sizeChoice, setSizeChoice] = useState('1024x768');
  const [customSize, setCustomSize] = useState('');
  const [productCodes, setProductCodes] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [position, setPosition] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const productOptions = [
    "C1012 Glacier White", "C1026 Polar", "C3269 Ash Grey",
    "C3168 Silver Wave", "C1005 Milky White", "C2103 Onyx Carrara",
    // Thêm các lựa chọn khác từ PRODUCT_IMAGE_MAP
  ];

  const handleText2Img = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/text2img`,
        {
          prompt: textPrompt,
          size_choice: sizeChoice,
          custom_size: sizeChoice === 'Custom size' ? customSize : null,
          product_codes: productCodes
        },
        {
          headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
          responseType: 'blob'
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi tạo ảnh: ' + error.message);
    }
    setLoading(false);
  };

  const handleImg2Img = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Vui lòng chọn ảnh để tải lên');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('position', position);
    formData.append('size_choice', sizeChoice);
    formData.append('custom_size', sizeChoice === 'Custom size' ? customSize : null);
    formData.append('product_codes', JSON.stringify(productCodes));

    try {
      const response = await axios.post(
        `${API_URL}/img2img`,
        formData,
        {
          headers: {
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi xử lý ảnh: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <h1>Tạo Ảnh Sản Phẩm Casla Quartz</h1>
      
      {/* Text to Image Form */}
      <div className="section">
        <h2>Tạo ảnh từ văn bản</h2>
        <form onSubmit={handleText2Img}>
          <div>
            <label>Mô tả (Prompt):</label>
            <input
              type="text"
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Nhập mô tả bằng tiếng Việt"
              required
            />
          </div>

          <div>
            <label>Kích thước:</label>
            <select
              value={sizeChoice}
              onChange={(e) => setSizeChoice(e.target.value)}
            >
              <option value="1024x768">1024x768</option>
              <option value="Custom size">Tùy chỉnh</option>
            </select>
            {sizeChoice === 'Custom size' && (
              <input
                type="text"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="Ví dụ: 1280x720"
              />
            )}
          </div>

          <div>
            <label>Chọn sản phẩm:</label>
            <select
              multiple
              value={productCodes}
              onChange={(e) => setProductCodes(Array.from(e.target.selectedOptions, option => option.value))}
            >
              {productOptions.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo ảnh'}
          </button>
        </form>
      </div>

      {/* Image to Image Form */}
      <div className="section">
        <h2>Chuyển đổi ảnh</h2>
        <form onSubmit={handleImg2Img}>
          <Dropzone onDrop={acceptedFiles => setImageFile(acceptedFiles[0])}>
            {({getRootProps, getInputProps}) => (
              <section>
                <div {...getRootProps()} className="dropzone">
                  <input {...getInputProps()} />
                  <p>Kéo thả ảnh vào đây hoặc nhấp để chọn ảnh</p>
                </div>
              </section>
            )}
          </Dropzone>

          <div>
            <label>Vị trí áp dụng texture:</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ví dụ: countertop"
              required
            />
          </div>

          <div>
            <label>Chọn sản phẩm:</label>
            <select
              value={productCodes[0] || ''}
              onChange={(e) => setProductCodes([e.target.value])}
            >
              <option value="">Chọn một sản phẩm</option>
              {productOptions.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xử lý ảnh'}
          </button>
        </form>
      </div>

      {/* Display Generated Image */}
      {generatedImage && (
        <div className="section">
          <h2>Kết quả:</h2>
          <img src={generatedImage} alt="Generated" style={{maxWidth: '100%'}} />
          <a href={generatedImage} download="generated_image.png">Tải ảnh xuống</a>
        </div>
      )}
    </div>
  );
}

export default App;