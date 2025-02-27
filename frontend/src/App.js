import React, { useState } from 'react';
import axios from 'axios';
import Dropzone from 'react-dropzone';
import './App.css';

const API_URL = '/api'; // Backend chạy cùng domain, dùng prefix /api

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
    "C2104 Massa", "C3105 Casla Cloudy", "C3146 Casla Nova",
    "C2240 Marquin", "C2262 Concrete (Honed)", "C3311 Calacatta Sky",
    "C3346 Massimo", "C4143 Mario", "C4145 Marina",
    "C4202 Calacatta Gold", "C1205 Casla Everest", "C4211 Calacatta Supreme",
    "C4204 Calacatta Classic", "C1102 Super White", "C4246 Casla Mystery",
    "C4345 Oro", "C4346 Luxe", "C4342 Casla Eternal",
    "C4221 Athena", "C4255 Calacatta Extra"
  ];

  const handleText2Img = async (e) => {
    e.preventDefault();
    if (!textPrompt || productCodes.length === 0) {
      alert('Vui lòng nhập mô tả và chọn ít nhất một sản phẩm.');
      return;
    }
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
          headers: { 'Authorization': 'Bearer YOUR_API_KEY_HERE' }, // Thay bằng API key thực tế
          responseType: 'blob'
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi tạo ảnh: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const handleImg2Img = async (e) => {
    e.preventDefault();
    if (!imageFile || !position || productCodes.length === 0) {
      alert('Vui lòng tải ảnh lên, nhập vị trí và chọn một sản phẩm.');
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
            'Authorization': 'Bearer YOUR_API_KEY_HERE', // Thay bằng API key thực tế
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi xử lý ảnh: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  return (
    <div className="App">
       <header className="header">
        <div className="logo-container">
          <img src="/static/images/logo.png" alt="Casla Quartz Logo" className="logo-img" />
          <h1>Đưa CaslaQuartz vào công trình của bạn</h1>
        </div>
      </header>
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
              placeholder="Ví dụ: Bàn bếp hiện đại"
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
                  <p>{imageFile ? imageFile.name : 'Kéo thả ảnh vào đây hoặc nhấp để chọn ảnh'}</p>
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

  // Thêm loading spinner
  const LoadingSpinner = () => (
    <div className="loading-spinner"></div>
  );

  return (
    <div className="App">
      <h1>Tạo Ảnh Sản Phẩm Casla Quartz</h1>
      
      {/* Text to Image Form */}
      <div className="section">
        <h2>Tạo ảnh từ văn bản</h2>
        <form onSubmit={handleText2Img}>
          <div className="form-group">
            <label>Mô tả (Prompt):</label>
            <input
              type="text"
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Nhập mô tả bằng tiếng Việt"
              required
            />
          </div>

          <div className="form-group">
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

          <div className="form-group">
            <label>Chọn sản phẩm:</label>
            <select
              multiple
              value={productCodes}
              onChange={(e) => setProductCodes(Array.from(e.target.selectedOptions, option => option.value))}
              className="product-select"
            >
              {productOptions.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Tạo ảnh'}
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

          <div className="form-group">
            <label>Vị trí áp dụng texture:</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ví dụ: countertop"
              required
            />
          </div>

          <div className="form-group">
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
            {loading ? <LoadingSpinner /> : 'Xử lý ảnh'}
          </button>
        </form>
      </div>

      {/* Display Generated Image */}
      {generatedImage && (
        <div className="section image-preview">
          <h2>Kết quả:</h2>
          <img src={generatedImage} alt="Generated" className="generated-image" />
          <a href={generatedImage} download="generated_image.png" className="download-link">
            Tải ảnh xuống
          </a>
        </div>
      )}
    </div>
  );
}

export default App;