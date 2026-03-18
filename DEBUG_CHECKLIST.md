# Debugging Checklist for Content Types Implementation

## 1. Run the Migration Script
First, you need to migrate the database:
```bash
cd /home/miguel/Development/Miguel/social-media-manager
python migrate_content_types.py
```

## 2. Check Backend Startup
Run the test script:
```bash
python test_backend.py
```

## 3. Start the Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

## 4. Check API Endpoints
Visit these URLs in your browser:
- http://localhost:8000/api/content-types/ - Should show empty list `[]`
- http://localhost:8000/api/content-types/statistics/overview - Should show statistics
- http://localhost:8000/docs - Should show content type endpoints in Swagger UI

## 5. Initialize Default Content Types
```bash
curl -X POST http://localhost:8000/api/content-types/initialize-defaults
```

## 6. Common Issues & Solutions

### Issue: "Column content_type_tags does not exist"
**Solution**: You haven't run the migration script yet. Run `python migrate_content_types.py`

### Issue: "ImportError: cannot import name 'ContentType'"
**Solution**: Make sure you're in the correct directory and the backend is running from the right location

### Issue: Frontend shows no content types
**Solution**: Initialize default content types using the endpoint above

### Issue: "relation 'media_content_type_tags' does not exist"
**Solution**: The migration script should have created this. Check if the migration ran successfully

## 7. Frontend Checklist
- Make sure the ContentTypeTag component is imported where you want to use it
- Check browser console for TypeScript errors
- Verify the API calls are being made to the correct endpoints

## 8. What to Report
If it's still not working, please provide:
1. The exact error message
2. Which step failed (migration, backend startup, API call, etc.)
3. Browser console errors
4. Backend terminal output
