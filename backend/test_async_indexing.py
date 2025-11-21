#!/usr/bin/env python3
"""
Test script for async indexing pipeline
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.repositories.indexing_status_repository import IndexingStatusRepository
from app.models.indexing_status import (
    IndexingStatus, IndexingTaskType, IndexingTaskStatus, IndexingProgress
)


async def test_async_indexing_pipeline():
    """Test async indexing pipeline functionality"""
    
    print("🔄 Testing Async Indexing Pipeline")
    print("=" * 50)
    
    try:
        # Connect to database
        await connect_to_mongo()
        
        # Initialize repository
        status_repo = IndexingStatusRepository()
        
        # Test project ID
        test_project_id = "507f1f77bcf86cd799439011"
        test_task_id = "test-task-12345"
        
        print(f"📊 Testing with project ID: {test_project_id}")
        
        # Test 1: Create indexing status
        print("\n1. Creating indexing status record...")
        
        status_record = IndexingStatus(
            project_id=test_project_id,
            task_id=test_task_id,
            task_type=IndexingTaskType.PROJECT_REINDEXING,
            status=IndexingTaskStatus.PENDING,
            progress=IndexingProgress(current=0, total=100, status_message="Starting..."),
            metadata={"test": True, "started_by": "test_user"}
        )
        
        created_status = await status_repo.create(status_record)
        print(f"   ✅ Created status record: {created_status.id}")
        print(f"      Task ID: {created_status.task_id}")
        print(f"      Status: {created_status.status}")
        
        # Test 2: Update progress
        print("\n2. Testing progress updates...")
        
        progress_updates = [
            (10, "Initializing..."),
            (25, "Processing files..."),
            (50, "Generating embeddings..."),
            (75, "Discovering relationships..."),
            (90, "Finalizing..."),
        ]
        
        for current, message in progress_updates:
            await status_repo.update_task_progress(test_task_id, current, 100, message)
            updated_status = await status_repo.get_by_task_id(test_task_id)
            print(f"   📈 Progress: {updated_status.progress.current}% - {updated_status.progress.status_message}")
        
        # Test 3: Mark as started
        print("\n3. Testing task lifecycle...")
        
        await status_repo.mark_task_started(test_task_id)
        started_status = await status_repo.get_by_task_id(test_task_id)
        print(f"   🚀 Task started at: {started_status.started_at}")
        print(f"      Status: {started_status.status}")
        
        # Test 4: Mark as completed
        result_data = {
            "files_processed": 5,
            "chunks_created": 150,
            "entities_extracted": 25,
            "relationships_discovered": 12
        }
        
        await status_repo.mark_task_completed(test_task_id, result_data)
        completed_status = await status_repo.get_by_task_id(test_task_id)
        print(f"   ✅ Task completed at: {completed_status.completed_at}")
        print(f"      Status: {completed_status.status}")
        print(f"      Result: {completed_status.result}")
        print(f"      Duration: {completed_status.get_duration():.2f} seconds")
        
        # Test 5: Get project statistics
        print("\n4. Testing project statistics...")
        
        stats = await status_repo.get_project_stats(test_project_id)
        print(f"   📊 Project statistics:")
        print(f"      Total tasks: {stats.total_tasks}")
        print(f"      Active tasks: {stats.active_tasks}")
        print(f"      Completed tasks: {stats.completed_tasks}")
        print(f"      Failed tasks: {stats.failed_tasks}")
        print(f"      Last indexing: {stats.last_indexing}")
        print(f"      Avg duration: {stats.avg_duration_seconds:.2f}s" if stats.avg_duration_seconds else "      Avg duration: N/A")
        
        # Test 6: Get active tasks
        print("\n5. Testing active task retrieval...")
        
        # Create another active task
        active_task = IndexingStatus(
            project_id=test_project_id,
            task_id="active-task-67890",
            task_type=IndexingTaskType.RELATIONSHIP_DISCOVERY,
            status=IndexingTaskStatus.PROGRESS,
            progress=IndexingProgress(current=30, total=100, status_message="Analyzing relationships..."),
            metadata={"test": True}
        )
        
        await status_repo.create(active_task)
        
        active_tasks = await status_repo.get_active_tasks(test_project_id)
        print(f"   🔄 Found {len(active_tasks)} active tasks:")
        for task in active_tasks:
            print(f"      - {task.task_type}: {task.progress.current}% ({task.progress.status_message})")
        
        # Test 7: Get task history
        print("\n6. Testing task history...")
        
        history = await status_repo.get_task_history(test_project_id, limit=10)
        print(f"   📜 Task history ({len(history)} tasks):")
        for task in history:
            duration = task.get_duration()
            duration_str = f"{duration:.2f}s" if duration else "N/A"
            print(f"      - {task.task_type} ({task.status}) - Duration: {duration_str}")
        
        # Test 8: Cancel active tasks
        print("\n7. Testing task cancellation...")
        
        cancelled_count = await status_repo.cancel_active_tasks(test_project_id)
        print(f"   ❌ Cancelled {cancelled_count} active tasks")
        
        # Verify cancellation
        active_tasks_after = await status_repo.get_active_tasks(test_project_id)
        print(f"   ✅ Active tasks after cancellation: {len(active_tasks_after)}")
        
        # Cleanup test data
        print("\n8. Cleaning up test data...")
        
        deleted_count = await status_repo.delete_by_project(test_project_id)
        print(f"   🗑️  Deleted {deleted_count} status records")
        
        print("\n✅ All async indexing pipeline tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await close_mongo_connection()
    
    return True


async def main():
    """Main test function"""
    print("🚀 Starting Async Indexing Pipeline Tests")
    print("=" * 60)
    
    success = await test_async_indexing_pipeline()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)