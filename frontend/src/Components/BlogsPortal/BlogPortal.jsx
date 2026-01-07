import { Comment } from '@mui/icons-material';
import { Avatar, Tabs, Tab, Box, useMediaQuery, useTheme } from '@mui/material';
import { Bookmark, CrossIcon, Heart, MessageCircle, MoveRight, SquarePen, Search } from 'lucide-react';
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBlogModal from './AddBlogModal';
import { UserContext } from '../../userContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const DEFAULT_BLOG_IMAGE = 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const BlogPortal = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const pythonCodeUrl = process.env.REACT_APP_PYTHON_CODE_URL;

  const [activeTab, setActiveTab] = useState('all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [isAddBlogModalOpen, setIsAddBlogModalOpen] = useState(false);
  const [allBlogs, setAllBlogs] = useState([]);
  const [blogInteractions, setBlogInteractions] = useState({});
  const [likedBlogs, setLikedBlogs] = useState([]);
  const [recommendedBlogs, setRecommendedBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const {user} = useContext(UserContext);
  const userId = user?._id;
  const navigate = useNavigate();

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hr ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const fetchBlogs = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/v1/blogs/allBlogs`);
    
      const processedBlogs = response.data.map(blog => ({
        ...blog,
        id: blog._id,
        image: blog.coverPhoto || DEFAULT_BLOG_IMAGE,
        timeAgo: formatTimeAgo(blog.createdAt),
        categories: ['all', blog.category || 'other']
      }));

      setAllBlogs(processedBlogs);

      const initialInteractions = processedBlogs.reduce((acc, blog) => {
        acc[blog._id] = {
          liked: user ? blog.likes.some(like => 
            String(like) === String(user._id)
          ) : false,
          likeCount: blog.likes.length,
          commentCount: blog.comments?.length || 0,
          saved: user?.savedBlogs.includes(blog?._id)
        };
        return acc;
      }, {});

      setBlogInteractions(initialInteractions);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    }
  };

  const fetchLikedBlogs = async () => {
    try {
      if (!user?._id) return [];
  
      const response = await axios.get(`${apiUrl}/api/v1/blogs/getLikedBlogs/${userId}`);
      
      const processedLikedBlogs = response.data.map(blog => ({
        id: blog._id,
        title: blog.title,
        subtitle: blog.subtitle,
        category: blog.category,
        content: blog.content
      }));

      setLikedBlogs(processedLikedBlogs);
      return processedLikedBlogs;
    } catch (error) {
      console.error('Error fetching liked blogs:', error);
      toast.error('Failed to load liked blogs');
      return [];
    }
  };

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const likedBlogsToUse = likedBlogs;
      
      if (!allBlogs.length || !likedBlogsToUse.length) {
        toast.info('Not enough data for recommendations');
        setIsLoading(false);
        return;
      }

      const processedAllBlogs = allBlogs.map(blog => ({
        id: blog._id,
        title: blog.title,
        subtitle: blog.subtitle,
        category: blog.category,
        content: blog.content
      }));

      const response = await axios.post(`${pythonCodeUrl}/get_recommendations`, {
        all_blogs: processedAllBlogs,
        liked_blogs: likedBlogsToUse,
        top_n: 5
      });

      const processedRecommendedBlogs = response.data.map(blog => {
        const originalBlog = allBlogs.find(b => b._id === blog.id) || {};
        
        return {
          ...originalBlog,
          ...blog,
          _id: blog.id,
          id: blog.id,
          image: originalBlog.coverPhoto || DEFAULT_BLOG_IMAGE,
          timeAgo: formatTimeAgo(originalBlog.createdAt || new Date()),
          categories: ['all', 'recommended', blog.category || 'other'],
          author: originalBlog.author || {
            name: blog.authorName || 'Anonymous'
          }
        };
      });

      setRecommendedBlogs(processedRecommendedBlogs);

      const recommendedInteractions = processedRecommendedBlogs.reduce((acc, blog) => {
        if (!blogInteractions[blog.id]) {
          acc[blog.id] = {
            liked: false,
            likeCount: 0,
            commentCount: 0,
            saved: false
          };
        }
        return acc;
      }, {});

      setBlogInteractions(prev => ({
        ...prev,
        ...recommendedInteractions
      }));

    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendedBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [allBlogs, likedBlogs, blogInteractions]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchBlogs();
      if (user?._id) {
        const likedBlogs = await fetchLikedBlogs();
        if (likedBlogs.length > 0) {
          await fetchRecommendations(likedBlogs);
        }
      }
    };
    
    loadInitialData();
  }, [userId]);

  useEffect(() => {
    let results = [];
    
    if (activeTab === 'recommended') {
      results = recommendedBlogs;
    } else if (activeTab !== 'all' && activeTab !== 'recommended') {
      results = allBlogs.filter(blog => blog.categories.includes(activeTab));
    } else {
      results = allBlogs;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(blog => 
        blog.title.toLowerCase().includes(query) || 
        blog.categories.some(category => category.toLowerCase().includes(query)) ||
        blog.subtitle?.toLowerCase().includes(query) ||
        blog.author?.name?.toLowerCase().includes(query)
      );
    }
    
    setFilteredBlogs(results);
  }, [activeTab, searchQuery, allBlogs, recommendedBlogs]);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'technology', label: 'Tech' },
    { id: 'business', label: 'Business' },
    { id: 'travel', label: 'Travel' },
    { id: 'other', label: 'Other' },
    { id: 'recommended', label: isMobile ? 'For You' : 'Recommended' }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 'recommended' && likedBlogs.length > 0) {
      fetchRecommendations();
    }
  };

  const handleLike = async (blogId) => {
    if (!user) {
      toast.error('Please log in to like a blog');
      return;
    }
  
    const isLiked = blogInteractions[blogId]?.liked;
  
    try {
      const response = await axios.post(
        `${apiUrl}/api/v1/blogs/${isLiked ? 'removeLike' : 'addLike'}`,
        { blogId, userId: user._id }
      );
  
      setBlogInteractions(prev => ({
        ...prev,
        [blogId]: {
          ...prev[blogId],
          liked: !isLiked, 
          likeCount: response.data.likes.length
        }
      }));
      
      if (!isLiked) {
        const updatedLikedBlogs = await fetchLikedBlogs();
        if (updatedLikedBlogs.length > 0) {
          await fetchRecommendations(updatedLikedBlogs);
        }
      } else {
        const updatedLikedBlogs = await fetchLikedBlogs();
        if (updatedLikedBlogs.length > 0) {
          await fetchRecommendations(updatedLikedBlogs);
        }
      }
  
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like status');
    }
  };

  const handleSave = async (blogId) => {
    if (!user) {
      toast.error('Please log in to save a blog');
      return;
    }

    try {
      const isSaved = blogInteractions[blogId]?.saved;
      const url = isSaved 
        ? `${apiUrl}/api/v1/auth/unsaveBlog`
        : `${apiUrl}/api/v1/auth/saveBlog`;

      await axios.post(url, { 
        blogId, 
        userId: user._id 
      });

      setBlogInteractions(prev => ({
        ...prev,
        [blogId]: {
          ...prev[blogId],
          saved: !isSaved
        }
      }));

      toast.success(isSaved ? 'Blog unsaved' : 'Blog saved');
    } catch (error) {
      console.error('Error saving/unsaving blog:', error);
      toast.error('Failed to save/unsave blog');
    }
  };

  const handleReadMoreClick = async (blog) => {    
    navigate(`/blogs/blogIndi/${blog.id}`);
  };

  const getBlogCoverPhotoUrl = (coverPhoto) => {
    if (!coverPhoto) return DEFAULT_BLOG_IMAGE;
    if (coverPhoto.startsWith('http://') || coverPhoto.startsWith('https://')) {
      return coverPhoto;
    }
    return `${apiUrl}/api/v1/blogs/uploadss/${coverPhoto}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className={`flex flex-col h-full mx-auto bg-white rounded-lg text-base ${
        isMobile ? 'w-full' : isTablet ? 'w-11/12' : 'w-5/6 md:w-1/2'
      }`}>
        {/* Top App Bar */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          {/* Search Bar */}
          <div className={`pt-4 pb-4 ${isMobile ? 'px-4' : 'px-6'}`}>
            <div className="flex items-center bg-gray-50 rounded-full p-2 px-4 border border-gray-100">
              <div className="text-gray-400 mr-2">
                <Search size={isMobile ? 16 : 20} />
              </div>
              <input 
                type="text" 
                placeholder={isMobile ? "Search..." : "Search by title or category..."} 
                className="bg-transparent border-none flex-grow outline-none text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <CrossIcon size={16} />
                </button>
              )}
            </div>
          </div>

          {/* MUI Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
              allowScrollButtonsMobile
              sx={{
                '& .MuiTabs-indicator': {
                  background: 'linear-gradient(to right, #60a5fa, #2563eb)',
                  height: 2,
                },
                '& .MuiTab-root': {
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: isMobile ? 40 : 48,
                  minWidth: isMobile ? 'auto' : 90,
                  padding: isMobile ? '8px 12px' : '12px 16px',
                  color: '#6b7280',
                  '&.Mui-selected': {
                    color: '#2563eb',
                  },
                  '&:hover': {
                    color: '#374151',
                  }
                }
              }}
            >
              {categories.map(category => (
                <Tab
                  key={category.id}
                  label={category.label}
                  value={category.id}
                />
              ))}
            </Tabs>
          </Box>
        </div>

        {/* Blog Posts */}
        <div className={`flex-grow ${isMobile ? 'p-4' : 'p-6'}`}>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading recommendations...</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-300 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-600">No matching blogs found</h3>
              <p className="text-gray-500 text-sm mt-1 px-4">
                {activeTab === 'recommended' 
                  ? "Like more blogs to get personalized recommendations!" 
                  : "Try adjusting your search or category filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBlogs.map(blog => (
                <div key={blog._id || blog.id} className="bg-white border border-gray-300 hover:border-gray-500 rounded-xl hover:shadow-md transition-all duration-300">
                  <div className={`${isMobile ? 'p-4' : 'p-5'}`}>
                    <div className={`flex items-center mb-3 ${isMobile ? 'gap-2' : 'gap-4'}`}>
                      <Avatar 
                        src={blog.author?.name} 
                        alt={blog.author?.name} 
                        sx={{ 
                          width: isMobile ? 32 : 40, 
                          height: isMobile ? 32 : 40 
                        }}
                      />
                      <div className='flex flex-col text-left'>
                        <span className={`font-medium block text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
                          {blog?.author?.name}
                        </span>
                        <span className="text-gray-400 text-xs">{blog.timeAgo}</span>
                      </div>
                    </div>
                    
                    <h2 className={`font-bold mb-2 text-gray-800 text-left ${isMobile ? 'text-lg' : 'text-xl'}`}>
                      {blog.title}
                    </h2>
                    
                    <p className={`text-gray-600 mb-4 line-clamp-2 text-left ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {blog.subtitle}
                    </p>
                    
                    <div className="mb-4 mt-2 rounded-lg overflow-hidden">
                      <img 
                        src={getBlogCoverPhotoUrl(blog?.coverPhoto)}
                        alt={blog.title}
                        className={`mx-auto object-cover rounded-lg ${
                          isMobile 
                            ? 'w-full h-48' 
                            : isTablet 
                              ? 'w-4/5 h-56' 
                              : 'w-3/4 lg:h-48 h-max-1/2'
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-1">
                        {blog.categories.slice(0, isMobile ? 2 : 3).map(category => {
                          const categoryObj = categories.find(c => c.id === category);
                          return categoryObj ? (
                            <span 
                              key={category} 
                              className={`px-3 py-1 bg-blue-50 text-blue-700 rounded-full ${
                                isMobile ? 'text-xs' : 'text-xs'
                              }`}
                            >
                              {categoryObj.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Interaction Buttons */}
                    {blogInteractions[blog?._id || blog?.id] && (
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex justify-between">
                          <div className={`flex ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
                            {/* Like Button */}
                            <button 
                              onClick={() => handleLike(blog._id || blog.id)} 
                              className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                            >
                              <Heart
                                size={isMobile ? 16 : 18}
                                className={`cursor-pointer ${
                                  blogInteractions[blog._id || blog.id]?.liked ? "fill-blue-600 text-blue-600" : "text-gray-600"
                                }`}
                              />
                              <span className="text-xs">{blogInteractions[blog._id || blog.id]?.likeCount || 0}</span>
                            </button>
                            
                            {/* Comment Count Display */}
                            <div className="flex items-center space-x-1 text-gray-500">
                              <MessageCircle size={isMobile ? 16 : 18} />
                              <span className="text-xs">{blogInteractions[blog._id || blog.id]?.commentCount || 0}</span>
                            </div>
                          </div>
                          
                          {/* Save Button */}
                          <button 
                            onClick={() => handleSave(blog._id || blog.id)} 
                            className={`flex items-center space-x-1 ${blogInteractions[blog._id || blog.id]?.saved ? 'text-blue-600 ' : 'text-gray-500'}`}
                          >
                            <Bookmark
                              size={isMobile ? 16 : 18}
                              className={`${blogInteractions[blog._id || blog.id]?.saved ? "fill-blue-600" : "text-gray-600"}`} 
                            />
                            <span className="text-xs">Save</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className={`text-center px-auto py-2 rounded-xl justify-center flex flex-row items-center mx-auto mt-4 bg-gray-900 hover:bg-gray-800 cursor-pointer ${
                      isMobile ? 'w-full' : 'w-3/4'
                    }`}>
                      <button 
                        className={`text-white font-medium flex flex-row items-center hover:text-gray-100 ${
                          isMobile ? 'text-sm' : 'text-base'
                        }`}
                        onClick={() => handleReadMoreClick(blog)}
                      >
                        Read more
                        <MoveRight className="ml-1" size={isMobile ? 16 : 20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed left-0 bottom-4 md:bottom-6 md:right-6">
        <button 
          className={`bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors ${
            isMobile ? 'w-12 h-12' : 'w-14 h-14'
          }`}
          onClick={() => setIsAddBlogModalOpen(true)}
        >
          <SquarePen size={isMobile ? 20 : 24} />
        </button>
      </div>
      
      <AddBlogModal
        isOpen={isAddBlogModalOpen}
        onClose={() => setIsAddBlogModalOpen(false)}
        loggedInUser={user}
      />
    </div>
  );
};

export default BlogPortal;